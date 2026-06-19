"""
SafeChat — Jigsaw Toxic Comment Dataset Loader
================================================
PyTorch Dataset wrapper for the Jigsaw Toxic Comment Classification Challenge CSV.

Expected CSV columns:
    id, comment_text, toxic, severe_toxic, obscene, threat, insult, identity_hate

Usage:
    from dataset import JigsawDataset, build_dataloaders
    train_loader, val_loader, test_loader = build_dataloaders('data/train.csv', tokenizer)
"""

import os
import logging
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader, random_split
from transformers import PreTrainedTokenizer
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# LABEL CONFIGURATION  (mirrors classifier.py output labels)
# ─────────────────────────────────────────────────────────────
LABEL_COLUMNS = [
    'toxic',
    'severe_toxic',
    'obscene',
    'threat',
    'insult',
    'identity_hate',
]
NUM_LABELS = len(LABEL_COLUMNS)


# ─────────────────────────────────────────────────────────────
# DATASET CLASS
# ─────────────────────────────────────────────────────────────
class JigsawDataset(Dataset):
    """
    Multi-label toxic comment dataset from Jigsaw CSV files.

    Args:
        dataframe:   A pandas DataFrame with 'comment_text' and the 6 label columns.
        tokenizer:   A HuggingFace tokenizer (RobertaTokenizer).
        max_length:  Maximum token sequence length (default: 256).
    """

    def __init__(
        self,
        dataframe: pd.DataFrame,
        tokenizer: PreTrainedTokenizer,
        max_length: int = 256,
    ):
        self.tokenizer = tokenizer
        self.max_length = max_length

        # Validate required columns
        missing = [c for c in ['comment_text'] + LABEL_COLUMNS if c not in dataframe.columns]
        if missing:
            raise ValueError(f"Dataset CSV is missing columns: {missing}")

        self.texts = dataframe['comment_text'].astype(str).tolist()
        self.labels = dataframe[LABEL_COLUMNS].values.astype('float32')

        logger.info(
            f"JigsawDataset created — {len(self.texts):,} samples | "
            f"Toxic rate: {dataframe['toxic'].mean():.2%}"
        )

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> dict:
        text = self.texts[idx]
        labels = self.labels[idx]

        encoding = self.tokenizer(
            text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt',
        )

        return {
            'input_ids': encoding['input_ids'].squeeze(0),        # (seq_len,)
            'attention_mask': encoding['attention_mask'].squeeze(0),  # (seq_len,)
            'labels': torch.tensor(labels, dtype=torch.float32),  # (6,)
        }


# ─────────────────────────────────────────────────────────────
# DATA LOADING HELPERS
# ─────────────────────────────────────────────────────────────
def load_jigsaw_csv(
    csv_path: str,
    sample_size: Optional[int] = None,
    balance_classes: bool = True,
    random_seed: int = 42,
) -> pd.DataFrame:
    """
    Load and preprocess the Jigsaw CSV file.

    Args:
        csv_path:        Path to the train.csv from Kaggle.
        sample_size:     If set, limits total rows (useful for CPU-only runs).
        balance_classes: If True, oversample minority (toxic) class to reduce imbalance.
        random_seed:     Reproducibility seed.

    Returns:
        A preprocessed pandas DataFrame.
    """
    logger.info(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)

    # Drop rows with null comments
    df = df.dropna(subset=['comment_text'])

    # Basic text cleaning — strip whitespace, handle encoding artifacts
    df['comment_text'] = df['comment_text'].str.strip()
    df = df[df['comment_text'].str.len() > 3]  # Drop near-empty rows

    # Ensure label columns exist and are binary int
    for col in LABEL_COLUMNS:
        if col not in df.columns:
            logger.warning(f"Column '{col}' not found in CSV, filling with 0")
            df[col] = 0
        df[col] = df[col].fillna(0).astype(int).clip(0, 1)

    logger.info(f"Loaded {len(df):,} valid samples")
    logger.info("Label distribution:")
    for col in LABEL_COLUMNS:
        logger.info(f"  {col}: {df[col].sum():,} ({df[col].mean():.2%})")

    # Optional class balancing: duplicate toxic samples to reduce 90:10 imbalance
    if balance_classes:
        toxic_mask = df[LABEL_COLUMNS].any(axis=1)
        toxic_df = df[toxic_mask]
        clean_df = df[~toxic_mask]

        # Cap clean samples at 3× the toxic count for manageable imbalance
        target_clean = min(len(clean_df), len(toxic_df) * 3)
        clean_df = clean_df.sample(n=target_clean, random_state=random_seed)

        df = pd.concat([toxic_df, clean_df]).sample(frac=1, random_state=random_seed)
        logger.info(
            f"After balancing: {len(df):,} total "
            f"({len(toxic_df):,} toxic, {target_clean:,} clean)"
        )

    # Optional sample cap (for CPU-only / quick experiments)
    if sample_size and sample_size < len(df):
        df = df.sample(n=sample_size, random_state=random_seed)
        logger.info(f"Sampled down to {sample_size:,} rows for quick training")

    return df.reset_index(drop=True)


def build_dataloaders(
    csv_path: str,
    tokenizer: PreTrainedTokenizer,
    max_length: int = 256,
    batch_size: int = 16,
    val_split: float = 0.10,
    test_split: float = 0.10,
    sample_size: Optional[int] = None,
    balance_classes: bool = True,
    num_workers: int = 0,
    random_seed: int = 42,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Build train / validation / test DataLoaders from the Jigsaw CSV.

    Args:
        csv_path:        Path to train.csv
        tokenizer:       HuggingFace tokenizer
        max_length:      Max token length (default: 256)
        batch_size:      Training batch size (default: 16)
        val_split:       Fraction for validation (default: 0.10)
        test_split:      Fraction for test (default: 0.10)
        sample_size:     Optional row cap (for CPU-only runs)
        balance_classes: Oversample minority class
        num_workers:     DataLoader workers (0 = main thread, safe for Windows)
        random_seed:     Reproducibility seed

    Returns:
        (train_loader, val_loader, test_loader)
    """
    df = load_jigsaw_csv(csv_path, sample_size=sample_size, balance_classes=balance_classes, random_seed=random_seed)
    full_dataset = JigsawDataset(df, tokenizer, max_length=max_length)

    total = len(full_dataset)
    n_test = int(total * test_split)
    n_val = int(total * val_split)
    n_train = total - n_val - n_test

    generator = torch.Generator().manual_seed(random_seed)
    train_ds, val_ds, test_ds = random_split(
        full_dataset, [n_train, n_val, n_test], generator=generator
    )

    logger.info(f"Split — train: {n_train:,} | val: {n_val:,} | test: {n_test:,}")

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size * 2,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size * 2,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    return train_loader, val_loader, test_loader
