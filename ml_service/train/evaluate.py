"""
SafeChat — Model Evaluation & Threshold Analysis
=================================================
Loads the fine-tuned RoBERTa model from ../model/ and runs a comprehensive
evaluation on the test split of the Jigsaw dataset.

Outputs:
  - Per-label AUC-ROC, Precision, Recall, F1
  - Confusion matrix per label
  - Optimal threshold recommendation per label
  - evaluation_report.json in ../model/

Usage:
    python evaluate.py
    python evaluate.py --data data/train.csv --threshold 0.40
    python evaluate.py --find-threshold   # auto-find optimal threshold per label
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path

import torch
import numpy as np

# Add parent dir for dataset.py
sys.path.insert(0, str(Path(__file__).parent))
from dataset import build_dataloaders, LABEL_COLUMNS, NUM_LABELS, load_jigsaw_csv, JigsawDataset
from torch.utils.data import DataLoader

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)-8s | %(message)s')
logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent.parent / 'model'
DATA_DIR  = Path(__file__).parent / 'data'


# ─────────────────────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────────────────────
def load_model_and_tokenizer(model_dir: Path):
    """Load the fine-tuned SafeChat model."""
    from transformers import RobertaTokenizer, RobertaForSequenceClassification

    if not model_dir.exists():
        logger.error(
            f"Model directory not found: {model_dir}\n"
            "Run train.py first to fine-tune the model."
        )
        sys.exit(1)

    logger.info(f"Loading model from {model_dir}...")
    tokenizer = RobertaTokenizer.from_pretrained(str(model_dir))
    model = RobertaForSequenceClassification.from_pretrained(str(model_dir), num_labels=NUM_LABELS)

    # Load SafeChat metadata if present
    meta_path = model_dir / 'safechat_meta.json'
    meta = {}
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        logger.info(f"Model trained on: {meta.get('base_model', 'unknown')}")
        logger.info(f"Saved at: {meta.get('saved_at', 'unknown')}")

    return model, tokenizer, meta


# ─────────────────────────────────────────────────────────────
# INFERENCE
# ─────────────────────────────────────────────────────────────
@torch.no_grad()
def get_predictions(model, loader, device):
    """Run inference on a DataLoader, return (probabilities, true_labels)."""
    model.eval()
    all_probs  = []
    all_labels = []

    for batch in loader:
        input_ids      = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        probs = torch.sigmoid(outputs.logits).cpu()
        all_probs.append(probs)
        all_labels.append(batch['labels'])

    return torch.cat(all_probs).numpy(), torch.cat(all_labels).numpy().astype(int)


# ─────────────────────────────────────────────────────────────
# METRICS
# ─────────────────────────────────────────────────────────────
def compute_metrics(probs, labels, threshold: float = 0.40):
    """
    Compute comprehensive metrics for each label.
    Returns a dict of per-label metrics plus overall summary.
    """
    from sklearn.metrics import (
        roc_auc_score, precision_score, recall_score,
        f1_score, confusion_matrix,
    )

    preds = (probs >= threshold).astype(int)
    results = {}

    for i, label in enumerate(LABEL_COLUMNS):
        y_true = labels[:, i]
        y_prob = probs[:, i]
        y_pred = preds[:, i]

        n_pos = y_true.sum()
        n_neg = len(y_true) - n_pos

        if n_pos == 0:
            logger.warning(f"  [{label}] No positive samples — skipping AUC")
            results[label] = {'auc': None, 'note': 'No positive samples in split'}
            continue

        auc = roc_auc_score(y_true, y_prob)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec  = recall_score(y_true, y_pred, zero_division=0)
        f1   = f1_score(y_true, y_pred, zero_division=0)
        cm   = confusion_matrix(y_true, y_pred)

        tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

        results[label] = {
            'auc':       round(float(auc),  4),
            'precision': round(float(prec), 4),
            'recall':    round(float(rec),  4),
            'f1':        round(float(f1),   4),
            'tp': int(tp), 'fp': int(fp),
            'fn': int(fn), 'tn': int(tn),
            'n_positive': int(n_pos),
            'n_negative': int(n_neg),
        }

    # Overall summary
    valid_aucs = [v['auc'] for v in results.values() if v.get('auc') is not None]
    results['_summary'] = {
        'threshold':       threshold,
        'mean_auc':        round(float(np.mean(valid_aucs)), 4) if valid_aucs else None,
        'mean_f1':         round(float(np.mean([v['f1'] for v in results.values() if 'f1' in v])), 4),
        'n_samples':       int(len(labels)),
        'n_toxic_samples': int((labels.any(axis=1)).sum()),
    }

    return results


def find_optimal_thresholds(probs, labels):
    """
    Find the probability threshold per label that maximises F1.
    Returns dict of {label: optimal_threshold}.
    """
    from sklearn.metrics import f1_score

    optimal = {}
    for i, label in enumerate(LABEL_COLUMNS):
        y_true = labels[:, i]
        y_prob = probs[:, i]
        if y_true.sum() == 0:
            optimal[label] = 0.40  # Default if no positives
            continue
        best_t, best_f1 = 0.40, 0.0
        for t in np.arange(0.10, 0.91, 0.05):
            y_pred = (y_prob >= t).astype(int)
            f1 = f1_score(y_true, y_pred, zero_division=0)
            if f1 > best_f1:
                best_f1 = f1
                best_t  = t
        optimal[label] = round(float(best_t), 2)
        logger.info(f"  {label:<20}: optimal threshold = {best_t:.2f}  (F1={best_f1:.4f})")

    return optimal


# ─────────────────────────────────────────────────────────────
# QUICK INFERENCE TEST
# ─────────────────────────────────────────────────────────────
def run_smoke_test(model, tokenizer, device, threshold: float = 0.40):
    """Run a set of known examples to sanity-check the loaded model."""
    test_cases = [
        ("Hello, how are you today?",                  False),
        ("I will kill you if you don't shut up",       True),
        ("You are such a stupid idiot",                True),
        ("Great work on the project, well done!",      False),
        ("You are disgusting and deserve to die",      True),
        ("Can we reschedule the meeting to Friday?",   False),
        ("Go kill yourself you worthless piece of trash", True),
        ("The weather is lovely today!",               False),
    ]

    logger.info("\nSmoke test — quick inference check:")
    logger.info(f"{'Text':<55} {'Expected':<10} {'Predicted':<10} {'Score':<8} {'✓/✗'}")
    logger.info("─" * 90)

    all_correct = True
    for text, expected_toxic in test_cases:
        inputs = tokenizer(
            text,
            max_length=256,
            padding='max_length',
            truncation=True,
            return_tensors='pt',
        ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.sigmoid(outputs.logits).cpu().numpy()[0]

        max_score = float(probs.max())
        predicted_toxic = max_score >= threshold
        correct = predicted_toxic == expected_toxic
        if not correct:
            all_correct = False

        label_short = text[:53] + '..' if len(text) > 55 else text
        status = '✓' if correct else '✗'
        logger.info(f"{label_short:<55} {'TOXIC' if expected_toxic else 'SAFE':<10} {'TOXIC' if predicted_toxic else 'SAFE':<10} {max_score:.4f}   {status}")

    logger.info(f"\nSmoke test result: {'ALL PASSED ✓' if all_correct else 'SOME FAILED ✗ — review training'}")
    return all_correct


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main(args):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Device: {device}")

    model, tokenizer, meta = load_model_and_tokenizer(MODEL_DIR)
    model.to(device)

    # Smoke test (always run)
    run_smoke_test(model, tokenizer, device, threshold=args.threshold)

    # Full dataset evaluation
    csv_path = args.data
    if not csv_path:
        default = DATA_DIR / 'train.csv'
        if default.exists():
            csv_path = str(default)
        else:
            logger.warning("No data CSV found — skipping full evaluation. Use --data path/to/train.csv")
            return

    logger.info(f"\nLoading evaluation data from {csv_path}...")
    _, val_loader, test_loader = build_dataloaders(
        csv_path=csv_path,
        tokenizer=tokenizer,
        max_length=256,
        batch_size=32,
        sample_size=args.sample_size,
        balance_classes=False,   # Evaluate on natural distribution
        num_workers=0,
    )

    logger.info("\nRunning inference on test split...")
    probs, labels = get_predictions(model, test_loader, device)

    # Threshold analysis
    if args.find_threshold:
        logger.info("\nFinding optimal thresholds per label...")
        optimal_thresholds = find_optimal_thresholds(probs, labels)
        logger.info(f"\nOptimal thresholds: {optimal_thresholds}")
        logger.info(f"Current threshold in classifier.py: {args.threshold}")

    # Full metrics
    metrics = compute_metrics(probs, labels, threshold=args.threshold)

    logger.info("\n" + "=" * 65)
    logger.info("EVALUATION RESULTS")
    logger.info("=" * 65)
    summary = metrics.pop('_summary')
    logger.info(f"Threshold : {summary['threshold']}")
    logger.info(f"Samples   : {summary['n_samples']:,} ({summary['n_toxic_samples']:,} toxic)")
    logger.info(f"Mean AUC  : {summary['mean_auc']}")
    logger.info(f"Mean F1   : {summary['mean_f1']}")
    logger.info("")
    logger.info(f"{'Label':<20} {'AUC':>8} {'Precision':>10} {'Recall':>8} {'F1':>8}")
    logger.info("─" * 60)
    for label, m in metrics.items():
        if 'auc' in m:
            logger.info(
                f"{label:<20} {str(m['auc']):>8} "
                f"{str(m['precision']):>10} {str(m['recall']):>8} {str(m['f1']):>8}"
            )

    # Save report
    report = {'summary': summary, 'per_label': metrics}
    if args.find_threshold:
        report['optimal_thresholds'] = optimal_thresholds
    report_path = MODEL_DIR / 'evaluation_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    logger.info(f"\nFull report saved to: {report_path}")


def parse_args():
    parser = argparse.ArgumentParser(description='Evaluate SafeChat fine-tuned RoBERTa model')
    parser.add_argument('--data',           default=None, help='Path to Jigsaw train.csv')
    parser.add_argument('--threshold',      type=float, default=0.40, help='Classification threshold (default: 0.40)')
    parser.add_argument('--sample-size',    type=int, default=None, help='Limit evaluation to N samples')
    parser.add_argument('--find-threshold', action='store_true', help='Find optimal threshold per label')
    return parser.parse_args()


if __name__ == '__main__':
    main(parse_args())
