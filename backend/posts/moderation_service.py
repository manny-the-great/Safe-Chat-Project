"""
Moderation Service
Calls the FastAPI ML microservice and enforces the three-layer
zero-tolerance policy. Returns a classification result dict.
"""
import requests
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def classify_content(text: str, user) -> dict:
    """
    Send text to the ML classification microservice.
    Returns a dict with is_toxic, toxicity_score, label, rejection_layer, etc.

    Falls back to the local rule-based engine if ML service is unreachable.
    """
    try:
        response = requests.post(
            f'{settings.ML_SERVICE_URL}/classify',
            json={'text': text},
            timeout=settings.ML_SERVICE_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        logger.warning('ML service unreachable — using fallback classifier')
        return _fallback_classify(text)
    except Exception as e:
        logger.error(f'ML service error: {e}')
        return _fallback_classify(text)


def handle_rejection(user, content: str, content_type: str,
                     classification: dict, post_id=None) -> None:
    """
    Log rejection to DB. Increment violation count. Auto-ban if threshold exceeded.
    """
    from moderation.models import ModerationLog

    # Increment violation count
    user.violation_count += 1
    auto_banned = user.violation_count >= settings.AUTO_BAN_THRESHOLD

    if auto_banned and not user.is_banned:
        user.is_banned = True
        user.ban_reason = f'Auto-banned after {user.violation_count} violations'
        logger.info(f'Auto-banned user {user.username} after {user.violation_count} violations')

    user.save(update_fields=['violation_count', 'is_banned', 'ban_reason'])

    # Log to moderation table
    ModerationLog.objects.create(
        user=user,
        content=content,
        cleaned_text=classification.get('cleaned_text', ''),
        content_type=content_type,
        toxicity_score=classification.get('toxicity_score', 1.0),
        rejection_reason=classification.get('rejection_reason', 'Toxic content'),
        rejection_layer=classification.get('rejection_layer', 'UNKNOWN'),
        matched_categories=classification.get('matched_categories', []),
        inference_ms=classification.get('inference_ms', 0),
        status='rejected',
        post_id=post_id,
        violation_count=user.violation_count,
        auto_banned=auto_banned,
    )


# ── FALLBACK LOCAL CLASSIFIER ────────────────────────────────
# Used only when ML microservice is down.
# Production always uses the FastAPI service.

_PROFANITY = {
    'fuck','fucking','fucker','fucked','motherfucker','mf','shit','shitty',
    'bullshit','bitch','bitches','ass','asshole','arsehole','damn','goddamn',
    'dammit','hell','wtf','stfu','gtfo','kys','bastard','prick','dick',
    'dickhead','cock','cunt','pussy','twat','idiot','moron','stupid','dumbass',
    'retard','loser','worthless','useless','ugly','freak','weirdo','creep',
    'trash','garbage','scum','jerk','jackass','hate','kill','die','murder',
    'racist','sexist','nazi','slut','whore','thot','crazy','insane','psycho',
    'bimbo','faggot','fag','dyke','nigga','nigger',
}

import re

def _normalize(text: str) -> str:
    leet = {'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s'}
    t = text.lower()
    t = ''.join(leet.get(c, c) for c in t)
    t = re.sub(r'\b([a-z])\s([a-z])\s([a-z])\s([a-z])\b', r'\1\2\3\4', t)
    t = re.sub(r'([a-z])[*#_\-.]+([a-z])', r'\1\2', t)
    t = re.sub(r'(.)\1{2,}', r'\1\1', t)
    t = re.sub(r'[^\w\s]', '', t)
    return t.strip()


def _fallback_classify(text: str) -> dict:
    import time
    start = time.time()
    cleaned = _normalize(text)
    tokens = set(cleaned.split())
    hit = tokens & _PROFANITY
    if hit:
        return {
            'is_toxic': True,
            'toxicity_score': 1.0,
            'label': 'profanity_detected',
            'rejection_layer': 'LAYER_1_PROFANITY',
            'rejection_reason': f'Profanity detected: "{list(hit)[0]}" (fallback engine)',
            'cleaned_text': cleaned,
            'matched_categories': ['profanity'],
            'inference_ms': int((time.time() - start) * 1000),
        }
    return {
        'is_toxic': False,
        'toxicity_score': 0.0,
        'label': 'non-toxic',
        'rejection_layer': None,
        'rejection_reason': None,
        'cleaned_text': cleaned,
        'matched_categories': [],
        'inference_ms': int((time.time() - start) * 1000),
    }
