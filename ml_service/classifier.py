"""
SafeChat Classification Engine
================================
Four-Layer Zero-Tolerance Moderation System

Layer 1 — Profanity Filter      → Instant block (Dictionary + Regex)
Layer 2 — Threat Detection      → Violence, self-harm, and threat intent
Layer 3 — ML Toxicity Model     → RoBERTa toxicity score ≥ 0.40
Layer 4 — Sentiment Guard       → Hostile directed negative language

Detoxify uses a RoBERTa model fine-tuned on the Jigsaw Toxic Comment dataset.
It detects: toxicity, severe_toxicity, obscene, threat, insult, identity_attack.
"""

import re
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# TEXT NORMALIZER
# ─────────────────────────────────────────────────────────────
class TextNormalizer:
    LEET = {'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b',
            '@':'a','$':'s','!':'i','+':'t','(':'c',')':'o'}

    @classmethod
    def normalize(cls, text: str) -> str:
        t = text.lower()
        # Decode leetspeak
        t = ''.join(cls.LEET.get(c, c) for c in t)
        # Collapse spaced-out letters: f u c k → fuck
        t = re.sub(r'\b([a-z])\s([a-z])\s([a-z])\s([a-z])\b', r'\1\2\3\4', t)
        t = re.sub(r'\b([a-z])\s([a-z])\s([a-z])\b', r'\1\2\3', t)
        # Remove masking punctuation: f**k → fk
        t = re.sub(r'([a-z])[*#_\-\.]+([a-z])', r'\1\2', t)
        # Collapse repeated characters: fuuuuck → fuuck
        t = re.sub(r'(.)\1{2,}', r'\1\1', t)
        # Strip non-alphanumeric clutter
        t = re.sub(r'[^\w\s]', '', t)
        return t.strip()


# ─────────────────────────────────────────────────────────────
# LAYER 1: PROFANITY FILTER
# ─────────────────────────────────────────────────────────────
class ProfanityFilter:
    DICTIONARY = frozenset([
        'fuck','fucking','fucker','fucked','fucks','fk','fck','effing','motherfucker','motherfucking','mf','mutha','mofo',
        'shit','shits','shitty','bullshit','bs','crap','crappy','bitch','bitches','bitching','bitchy','btch',
        'ass','asses','asshole','assholes','arsehole','arseholes','arse','damn','damnit','goddamn','goddammit',
        'hell','wtf','stfu','gtfo','kys','omfg','bastard','bastards','prick','pricks','dick','dicks','dickhead',
        'cock','cocks','cocksucker','cunt','cunts','pussy','pussies','twat','twats',
        'idiot','idiots','idiotic','moron','morons','moronic','stupid','dumb','dumbass','dumbasses','dumbo',
        'retard','retards','retarded','loser','losers','pathetic','worthless','useless','ugly','freak','freaks',
        'weirdo','weirdos','creep','creeps','trash','garbage','scum','scumbag','scumbags','jerk','jerks','jackass',
        'lame','coward','cowards','wimp','wimps','crybaby','hate','hater','haters','racist','sexist','bigot','bigots',
        'nazi','nazis','piss','pissed','pissoff','pisses','bimbo','thot','slut','whore','hooker','skank','faggot','fag',
        'dyke','tranny','toxic','shut','shutup','nigga','nigger','wetback','spic','chink','gook','kike','cracker',
    ])

    PATTERNS = [
        re.compile(r'\bf+[u\*\W]+c+[k\*\W]+', re.I),
        re.compile(r'\bs+h+[i\*\W]+t+', re.I),
        re.compile(r'\bb+[i\*\W]+t+c+h+', re.I),
        re.compile(r'\ba+s+[s\*\W]+h+o+l+e+', re.I),
        re.compile(r'\bc+[u\*\W]+n+t+', re.I),
        re.compile(r'\bstfu\b', re.I),
        re.compile(r'\bwtf\b', re.I),
        re.compile(r'\bshut\s+(up|the\s+fuck\s+up)\b', re.I),
    ]

    @classmethod
    def check(cls, original: str, normalized: str) -> Optional[str]:
        tokens = set(normalized.split())
        hit = tokens & cls.DICTIONARY
        if hit: return list(hit)[0]
        for pattern in cls.PATTERNS:
            m = pattern.search(original) or pattern.search(normalized)
            if m: return m.group(0)
        return None


# ─────────────────────────────────────────────────────────────
# LAYER 2: THREAT & VIOLENCE DETECTION
# ─────────────────────────────────────────────────────────────
class ThreatFilter:
    PATTERNS = [
        re.compile(r'\b(kill|murder|stab|shoot|hang|strangle|burn|drown|assassinate|slaughter)\s+(you|u|them|him|her)\b', re.I),
        re.compile(r'\b(i\s+will|i\'m\s+gonna|gonna)\s+(kill|hurt|end|destroy)\s+(you|u)\b', re.I),
        re.compile(r'\b(die|kys|kill\s*yourself|go\s+die|hope\s+you\s+die)\b', re.I),
        re.compile(r'\b(i\s+have\s+a\s+gun|i\'m\s+armed|i\s+know\s+where\s+you\s+live)\b', re.I),
        re.compile(r'\b(punch|kick|break|beat)\s+(your|your|ur)\s+(face|head|teeth|bones)\b', re.I),
        re.compile(r'\b(encouraging|should)\s+self\s*harm\b', re.I),
        re.compile(r'\b(slit|cut)\s+(your|ur)\s+(wrist|throat)\b', re.I),
    ]

    @classmethod
    def check(cls, text: str) -> Optional[str]:
        for pattern in cls.PATTERNS:
            m = pattern.search(text)
            if m: return m.group(0)
        return None


# ─────────────────────────────────────────────────────────────
# LAYER 3: ML TOXICITY MODEL (Detoxify)
# ─────────────────────────────────────────────────────────────
class MLToxicityModel:
    THRESHOLD = 0.40  # Zero-tolerance threshold

    def __init__(self):
        self._model = None
        self._loaded = False

    def load(self):
        if self._loaded: return
        try:
            from detoxify import Detoxify
            logger.info('Loading RoBERTa model...')
            self._model = Detoxify('original')
            self._loaded = True
        except Exception as e:
            logger.error(f'Detoxify load error: {e}')
            self._model = None
            self._loaded = True

    def score(self, text: str) -> dict:
        self.load()
        if self._model is None:
            return {'score': 0.0, 'label': 'ml_unavailable', 'scores': {}}
        try:
            results = self._model.predict(text)
            max_score = max(results.values())
            dominant_label = max(results, key=results.get)
            return {
                'score': float(max_score),
                'label': dominant_label,
                'scores': {k: float(v) for k, v in results.items()},
            }
        except Exception as e:
            logger.error(f'Inference error: {e}')
            return {'score': 0.0, 'label': 'error', 'scores': {}}


# ─────────────────────────────────────────────────────────────
# LAYER 4: SENTIMENT GUARD
# ─────────────────────────────────────────────────────────────
class SentimentGuard:
    VERY_NEGATIVE = frozenset([
        'terrible','horrible','awful','dreadful','disgusting','revolting',
        'appalling','atrocious','hideous','horrendous','ghastly','vile',
        'abysmal','disastrous','catastrophic','miserable','wretched',
        'deplorable','contemptible','despicable','repulsive','nauseating',
        'sickening','infuriating','enraging','outrageous','unbearable',
        'intolerable','insufferable','obnoxious','abhorrent','detestable',
    ])
    INTENSIFIERS = frozenset([
        'very','so','extremely','absolutely','completely','totally','utterly','incredibly','deeply'
    ])

    @classmethod
    def analyze(cls, text: str) -> dict:
        tokens = re.sub(r'[^\w\s]', '', text.lower()).split()
        hits = 0
        intensified = False
        for i, tok in enumerate(tokens):
            if tok in cls.VERY_NEGATIVE:
                hits += 1
                if i > 0 and tokens[i-1] in cls.INTENSIFIERS:
                    intensified = True
                    hits += 1
        is_strongly_negative = hits >= 2 or (hits >= 1 and intensified)
        score = min(1.0, hits * 0.35 + (0.25 if intensified else 0.0))
        return {'is_strongly_negative': is_strongly_negative, 'score': round(score, 4), 'hits': hits}


# ─────────────────────────────────────────────────────────────
# MAIN CLASSIFICATION ENGINE
# ─────────────────────────────────────────────────────────────
ml_model = MLToxicityModel()

def classify(text: str) -> dict:
    start = time.time()
    cleaned = TextNormalizer.normalize(text)

    # L1: PROFANITY
    matched_p = ProfanityFilter.check(text, cleaned)
    if matched_p:
        return _result(True, 1.0, 'profanity', 'LAYER_1_PROFANITY', f'Profanity detected: "{matched_p}"', text, cleaned, start)

    # L2: THREAT (Regex check)
    matched_t = ThreatFilter.check(text) or ThreatFilter.check(cleaned)
    if matched_t:
        return _result(True, 1.0, 'threat', 'LAYER_2_THREAT', f'Potential threat or violence detected: "{matched_t}"', text, cleaned, start)

    # L3: ML MODEL
    ml_res = ml_model.score(text)
    # Also check L2 via ML results (threat category)
    if ml_res.get('scores', {}).get('threat', 0) > 0.35:
        return _result(True, float(ml_res['scores']['threat']), 'threat', 'LAYER_2_THREAT', 'AI detected threat/violence intent', text, cleaned, start)
    
    if ml_res['score'] >= MLToxicityModel.THRESHOLD:
        return _result(True, float(ml_res['score']), ml_res['label'], 'LAYER_3_ML_MODEL', f'AI detected toxic behavior ({ml_res["label"]})', text, cleaned, start)

    # L4: SENTIMENT
    sent = SentimentGuard.analyze(cleaned)
    if sent['is_strongly_negative']:
        return _result(True, sent['score'], 'negative_sentiment', 'LAYER_4_SENTIMENT', f'Hostile negative sentiment detected', text, cleaned, start)

    # APPROVED
    return _result(False, max(ml_res['score'], sent['score']), 'safe', None, text, cleaned, start)

def _result(toxic, score, label, layer, reason, text, cleaned, start):
    return {
        'is_toxic': toxic,
        'toxicity_score': round(score, 4),
        'label': label,
        'rejection_layer': layer,
        'rejection_reason': reason,
        'original_text': text,
        'cleaned_text': cleaned,
        'matched_categories': [label] if toxic else [],
        'inference_ms': int((time.time() - start) * 1000),
    }
