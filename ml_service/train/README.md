# SafeChat — RoBERTa Training Guide

This directory contains everything needed to fine-tune the RoBERTa model used by SafeChat's ML Classification Engine.

---

## Quick Start

### 1. Install training dependencies
```bash
cd ml_service/train
pip install -r requirements_train.txt
```

### 2. Set up Kaggle API key (one-time)
Download your `kaggle.json` from [https://www.kaggle.com/settings](https://www.kaggle.com/settings) and place it at:
```
~/.kaggle/kaggle.json     # Linux / macOS
C:\Users\<you>\.kaggle\kaggle.json  # Windows
```

Alternatively, manually download and unzip the dataset from:  
[Jigsaw Toxic Comment Classification Challenge](https://www.kaggle.com/competitions/jigsaw-toxic-comment-classification-challenge/data)  
and place `train.csv` in `ml_service/train/data/train.csv`.

### 3. Run Training

**GPU (recommended — full dataset, ~1-2 hours):**
```bash
python train.py
```

**CPU-only (fast mode — distilroberta + 20K samples, ~30-60 min):**
```bash
python train.py --fast
```

**Custom options:**
```bash
python train.py \
  --model roberta-base \
  --epochs 3 \
  --batch-size 16 \
  --max-length 256 \
  --lr 2e-5 \
  --sample-size 50000
```

### 4. Evaluate the Model
```bash
# Basic smoke test + full metrics report
python evaluate.py

# Find optimal per-label thresholds
python evaluate.py --find-threshold
```

### 5. Activate the Model
After training completes, the model is saved to `ml_service/model/`.  
Restart the ML service to automatically load it:
```bash
# Docker:
docker-compose restart ml_service

# Local:
cd ml_service && python main.py
```

Verify via the health endpoint:
```bash
curl http://localhost:8001/health
# Expected: {"ml_model_mode": "custom", ...}
```

---

## File Overview

| File | Purpose |
|---|---|
| `dataset.py` | PyTorch Dataset + DataLoader builder for Jigsaw CSV |
| `train.py` | Main fine-tuning script (downloads dataset, trains, saves model) |
| `evaluate.py` | Metrics evaluation: AUC-ROC, F1, threshold search, smoke test |
| `requirements_train.txt` | Training-only dependencies (not needed in Docker runtime) |
| `data/` | Auto-created; holds downloaded Jigsaw CSVs |

---

## Model Architecture

```
roberta-base (or distilroberta-base in --fast mode)
    │
  [CLS] representation
    │
  Linear(768 → 6)
    │
  Sigmoid
    │
  [toxic | severe_toxic | obscene | threat | insult | identity_hate]
```

- **Loss**: `BCEWithLogitsLoss` (multi-label binary cross-entropy)
- **Threshold**: `0.40` per label (matches `classifier.py` `THRESHOLD`)
- **Output**: `max(6 scores)` → `toxicity_score`, dominant label → `label`

---

## Classifier Integration

`ml_service/classifier.py` → `MLToxicityModel.load()` checks for `./model/config.json` first.  
If found, it loads the fine-tuned weights. If not, it falls back to Detoxify automatically.  
No code changes needed — just train and restart.
