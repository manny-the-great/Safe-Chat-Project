"""
SafeChat — RoBERTa Fine-Tuning Script
=======================================
Fine-tunes roberta-base (or distilroberta-base) on the Jigsaw Toxic Comment
Classification Challenge dataset for multi-label toxicity detection.

Output model is saved to ../model/ and is directly loadable by classifier.py.

Usage:
    # Full run (GPU recommended):
    python train.py

    # CPU-friendly quick run (uses distilroberta + 20K samples):
    python train.py --fast

    # Custom options:
    python train.py --model roberta-base --epochs 3 --batch-size 16 --data data/train.csv

Dataset download (requires Kaggle API key at ~/.kaggle/kaggle.json):
    kaggle competitions download -c jigsaw-toxic-comment-classification-challenge
"""

import os
import sys
import time
import json
import shutil
import logging
import argparse
from pathlib import Path
from datetime import datetime

# Windows Python 3.8+ DLL loading workaround for PyTorch
try:
    import site
    packages = site.getsitepackages()
    if packages:
        torch_lib = os.path.join(packages[0], 'torch', 'lib')
        if os.path.exists(torch_lib):
            os.add_dll_directory(torch_lib)
except Exception:
    pass

import torch
import torch.nn as nn
from torch.optim import AdamW
from transformers import (
    RobertaTokenizer,
    RobertaForSequenceClassification,
    get_linear_schedule_with_warmup,
)

# Add parent dir to path so we can import dataset.py
sys.path.insert(0, str(Path(__file__).parent))
from dataset import build_dataloaders, LABEL_COLUMNS, NUM_LABELS

# ─────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('training.log'),
    ],
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────
TRAIN_DIR = Path(__file__).parent          # ml_service/train/
DATA_DIR  = TRAIN_DIR / 'data'             # ml_service/train/data/
MODEL_OUT = TRAIN_DIR.parent / 'model'     # ml_service/model/  (loaded by classifier.py)


# ─────────────────────────────────────────────────────────────
# DATASET DOWNLOAD  (Kaggle API)
# ─────────────────────────────────────────────────────────────
def download_jigsaw_dataset():
    """Download Jigsaw dataset via Kaggle CLI if not already present."""
    train_csv = DATA_DIR / 'train.csv'
    if train_csv.exists():
        logger.info(f"Dataset already exists at {train_csv}")
        return str(train_csv)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading Jigsaw dataset from Kaggle...")

    kaggle_json = Path.home() / '.kaggle' / 'kaggle.json'
    if not kaggle_json.exists():
        logger.error(
            "Kaggle API key not found at ~/.kaggle/kaggle.json\n"
            "  Option A: Place your kaggle.json there (get it from https://www.kaggle.com/settings)\n"
            f"  Option B: Manually copy train.csv to {DATA_DIR}/"
        )
        sys.exit(1)

    ret = os.system(
        f'kaggle competitions download -c jigsaw-toxic-comment-classification-challenge '
        f'-p "{DATA_DIR}" --unzip'
    )
    if ret != 0:
        logger.error("Kaggle download failed. Check your API key and internet connection.")
        sys.exit(1)

    if not train_csv.exists():
        # The archive may extract to a subfolder — find it
        candidates = list(DATA_DIR.rglob('train.csv'))
        if candidates:
            shutil.move(str(candidates[0]), str(train_csv))
        else:
            logger.error(f"train.csv not found after download in {DATA_DIR}")
            sys.exit(1)

    logger.info(f"Dataset ready at {train_csv}")
    return str(train_csv)


# ─────────────────────────────────────────────────────────────
# TRAINING LOOP
# ─────────────────────────────────────────────────────────────
def train_epoch(model, loader, optimizer, scheduler, device, scaler=None):
    """Run one training epoch. Returns average loss."""
    model.train()
    criterion = nn.BCEWithLogitsLoss()
    total_loss = 0.0
    n_batches = len(loader)

    for step, batch in enumerate(loader):
        input_ids      = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels         = batch['labels'].to(device)

        optimizer.zero_grad()

        if scaler:
            # Mixed precision (GPU only)
            with torch.cuda.amp.autocast():
                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                loss = criterion(outputs.logits, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = criterion(outputs.logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        scheduler.step()
        total_loss += loss.item()

        if (step + 1) % 50 == 0 or (step + 1) == n_batches:
            avg = total_loss / (step + 1)
            pct = (step + 1) / n_batches * 100
            logger.info(f"  [{step+1:4d}/{n_batches}] ({pct:5.1f}%)  loss={avg:.4f}  lr={scheduler.get_last_lr()[0]:.2e}")

    return total_loss / n_batches


@torch.no_grad()
def evaluate(model, loader, device):
    """
    Evaluate model on a DataLoader.
    Returns dict with loss and per-label AUC-ROC.
    """
    from sklearn.metrics import roc_auc_score

    model.eval()
    criterion = nn.BCEWithLogitsLoss()
    total_loss = 0.0
    all_logits = []
    all_labels = []

    for batch in loader:
        input_ids      = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels         = batch['labels'].to(device)

        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        loss = criterion(outputs.logits, labels)
        total_loss += loss.item()

        all_logits.append(torch.sigmoid(outputs.logits).cpu())
        all_labels.append(labels.cpu())

    all_logits = torch.cat(all_logits).numpy()
    all_labels = torch.cat(all_labels).numpy().astype(int)

    aucs = {}
    for i, label in enumerate(LABEL_COLUMNS):
        col_labels = all_labels[:, i]
        if col_labels.sum() > 0:  # AUC requires at least one positive
            aucs[label] = roc_auc_score(col_labels, all_logits[:, i])
        else:
            aucs[label] = float('nan')

    mean_auc = sum(v for v in aucs.values() if v == v) / max(1, sum(1 for v in aucs.values() if v == v))

    return {
        'loss':     total_loss / len(loader),
        'mean_auc': mean_auc,
        'auc':      aucs,
    }


# ─────────────────────────────────────────────────────────────
# MAIN TRAINING FUNCTION
# ─────────────────────────────────────────────────────────────
def train(args):
    run_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    logger.info("=" * 65)
    logger.info(f"SafeChat RoBERTa Fine-Tuning  |  Run: {run_id}")
    logger.info("=" * 65)

    # ── Device ──────────────────────────────────────────────
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    use_amp = device.type == 'cuda'
    logger.info(f"Device : {device} {'(AMP enabled)' if use_amp else '(CPU — consider --fast for speed)'}")

    # ── Dataset ─────────────────────────────────────────────
    csv_path = args.data if args.data else download_jigsaw_dataset()

    sample_size = args.sample_size
    if args.fast and not args.sample_size:
        sample_size = 20_000
        logger.info("--fast mode: limiting to 20,000 samples")

    # ── Model & Tokenizer ───────────────────────────────────
    base_model = 'distilroberta-base' if args.fast else args.model
    logger.info(f"Base model: {base_model}")
    logger.info(f"Epochs: {args.epochs}  |  Batch size: {args.batch_size}  |  Max length: {args.max_length}")

    tokenizer = RobertaTokenizer.from_pretrained(base_model)

    # ── DataLoaders ─────────────────────────────────────────
    train_loader, val_loader, test_loader = build_dataloaders(
        csv_path=csv_path,
        tokenizer=tokenizer,
        max_length=args.max_length,
        batch_size=args.batch_size,
        sample_size=sample_size,
        balance_classes=not args.no_balance,
        num_workers=args.num_workers,
    )

    # ── Model ───────────────────────────────────────────────
    model = RobertaForSequenceClassification.from_pretrained(
        base_model,
        num_labels=NUM_LABELS,
        problem_type='multi_label_classification',
    )
    model.to(device)

    n_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"Trainable parameters: {n_params:,}")

    # ── Optimizer & Scheduler ────────────────────────────────
    no_decay = ['bias', 'LayerNorm.weight']
    optimizer_grouped = [
        {'params': [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)], 'weight_decay': args.weight_decay},
        {'params': [p for n, p in model.named_parameters() if any(nd in n for nd in no_decay)], 'weight_decay': 0.0},
    ]
    optimizer = AdamW(optimizer_grouped, lr=args.lr)

    total_steps = len(train_loader) * args.epochs
    warmup_steps = int(total_steps * 0.06)
    scheduler = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    scaler = torch.cuda.amp.GradScaler() if use_amp else None

    logger.info(f"Total steps: {total_steps:,}  |  Warmup steps: {warmup_steps}")

    # ── Training Loop ────────────────────────────────────────
    best_val_auc  = 0.0
    best_epoch    = 0
    history       = []

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()
        logger.info(f"\n{'─'*65}")
        logger.info(f"Epoch {epoch}/{args.epochs}")
        logger.info(f"{'─'*65}")

        train_loss = train_epoch(model, train_loader, optimizer, scheduler, device, scaler)
        val_metrics = evaluate(model, val_loader, device)

        elapsed = time.time() - epoch_start
        logger.info(
            f"Epoch {epoch} summary — "
            f"train_loss={train_loss:.4f} | "
            f"val_loss={val_metrics['loss']:.4f} | "
            f"val_mean_auc={val_metrics['mean_auc']:.4f} | "
            f"time={elapsed/60:.1f}m"
        )
        logger.info("  Per-label AUC:")
        for lbl, auc in val_metrics['auc'].items():
            logger.info(f"    {lbl:<20}: {auc:.4f}" if auc == auc else f"    {lbl:<20}: N/A (no positives in split)")

        record = {
            'epoch': epoch,
            'train_loss': train_loss,
            'val_loss': val_metrics['loss'],
            'val_mean_auc': val_metrics['mean_auc'],
            'val_auc': val_metrics['auc'],
        }
        history.append(record)

        # Save best checkpoint
        if val_metrics['mean_auc'] > best_val_auc:
            best_val_auc = val_metrics['mean_auc']
            best_epoch   = epoch
            logger.info(f"  ✓ New best model (mean AUC={best_val_auc:.4f}) — saving checkpoint...")
            _save_checkpoint(model, tokenizer, MODEL_OUT, base_model, record)

    # ── Final Test Evaluation ───────────────────────────────
    logger.info(f"\n{'='*65}")
    logger.info(f"Training complete. Best epoch: {best_epoch} (val mean AUC={best_val_auc:.4f})")
    logger.info(f"{'='*65}")
    logger.info("Running final evaluation on test set...")

    # Reload best model for test eval
    best_model = RobertaForSequenceClassification.from_pretrained(str(MODEL_OUT), num_labels=NUM_LABELS)
    best_model.to(device)
    test_metrics = evaluate(best_model, test_loader, device)

    logger.info(f"Test mean AUC : {test_metrics['mean_auc']:.4f}")
    logger.info(f"Test loss     : {test_metrics['loss']:.4f}")
    logger.info("Per-label test AUC:")
    for lbl, auc in test_metrics['auc'].items():
        logger.info(f"  {lbl:<20}: {auc:.4f}" if auc == auc else f"  {lbl:<20}: N/A")

    # Append test results to model metadata
    meta_path = MODEL_OUT / 'safechat_meta.json'
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        meta['test_metrics'] = {
            'mean_auc': test_metrics['mean_auc'],
            'auc': test_metrics['auc'],
        }
        meta['training_history'] = history
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

    logger.info(f"\nModel saved to: {MODEL_OUT.resolve()}")
    logger.info("The ml_service will automatically load this model on next startup.")


def _save_checkpoint(model, tokenizer, output_dir: Path, base_model: str, metrics: dict):
    """Save model, tokenizer, and SafeChat metadata to output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    # Write SafeChat-specific metadata (read by classifier.py)
    meta = {
        'safechat_model': True,
        'base_model': base_model,
        'label_columns': LABEL_COLUMNS,
        'num_labels': NUM_LABELS,
        'threshold': 0.40,
        'saved_at': datetime.now().isoformat(),
        'best_epoch_metrics': metrics,
    }
    with open(output_dir / 'safechat_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

    logger.info(f"  Saved model + tokenizer + metadata → {output_dir}")


# ─────────────────────────────────────────────────────────────
# ARGUMENT PARSER
# ─────────────────────────────────────────────────────────────
def parse_args():
    parser = argparse.ArgumentParser(
        description='Fine-tune RoBERTa for SafeChat toxic comment classification'
    )
    parser.add_argument('--model',       default='roberta-base',
                        help='Base HuggingFace model (default: roberta-base)')
    parser.add_argument('--data',        default=None,
                        help='Path to Jigsaw train.csv (auto-downloads if omitted)')
    parser.add_argument('--epochs',      type=int,   default=3,
                        help='Number of training epochs (default: 3)')
    parser.add_argument('--batch-size',  type=int,   default=16,
                        help='Training batch size (default: 16)')
    parser.add_argument('--max-length',  type=int,   default=256,
                        help='Max token sequence length (default: 256)')
    parser.add_argument('--lr',          type=float, default=2e-5,
                        help='Learning rate (default: 2e-5)')
    parser.add_argument('--weight-decay',type=float, default=0.01,
                        help='Weight decay (default: 0.01)')
    parser.add_argument('--sample-size', type=int,   default=None,
                        help='Limit dataset to N rows (default: full dataset)')
    parser.add_argument('--num-workers', type=int,   default=0,
                        help='DataLoader workers (default: 0, safe for Windows)')
    parser.add_argument('--no-balance',  action='store_true',
                        help='Disable class balancing (use raw imbalanced dataset)')
    parser.add_argument('--fast',        action='store_true',
                        help='CPU-friendly mode: distilroberta-base + 20K samples + 2 epochs')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    if args.fast:
        args.epochs = max(args.epochs, 2)
    train(args)
