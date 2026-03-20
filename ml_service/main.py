"""
SafeChat ML Microservice
FastAPI server exposing the three-layer classification engine.
Port: 8001
"""
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
import uvicorn
from classifier import classify, ml_model

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title='SafeChat Classification Engine',
    description='Four-layer zero-tolerance content moderation API',
    version='2.0.0',
)


class ClassifyRequest(BaseModel):
    text: str

    @field_validator('text')
    @classmethod
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        if len(v) > 5000:
            raise ValueError('Text too long (max 5000 chars)')
        return v


class ClassifyResponse(BaseModel):
    is_toxic: bool
    toxicity_score: float
    label: str
    rejection_layer: str | None
    rejection_reason: str | None
    cleaned_text: str
    matched_categories: list[str]
    inference_ms: int


@app.on_event('startup')
async def startup():
    """Pre-load the ML model so first requests aren't slow."""
    logger.info('Pre-loading Detoxify ML model...')
    ml_model.load()
    logger.info('ML model ready.')


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'service': 'SafeChat Classification Engine',
        'ml_model_loaded': ml_model._loaded and ml_model._model is not None,
    }


@app.post('/classify', response_model=ClassifyResponse)
def classify_endpoint(req: ClassifyRequest):
    """
    Classify a piece of text through the four-layer pipeline.
    Returns is_toxic, toxicity_score, label, and rejection details.
    """
    try:
        result = classify(req.text)
        return result
    except Exception as e:
        logger.error(f'Classification error: {e}')
        raise HTTPException(status_code=500, detail='Classification failed')


@app.post('/batch-classify')
def batch_classify(texts: list[str]):
    """Batch classification for admin retraining workflows."""
    if len(texts) > 100:
        raise HTTPException(status_code=400, detail='Max 100 texts per batch')
    return [classify(t) for t in texts]


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8001, reload=False, workers=1)
