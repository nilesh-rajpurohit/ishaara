from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import asr, translate, tts
from app.core.config import settings

app = FastAPI(
    title="Ishaara ML Service",
    description="AI engine for speech recognition, translation, and ISL",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asr.router, prefix="/asr", tags=["ASR"])
app.include_router(translate.router, prefix="/translate", tags=["Translation"])
app.include_router(tts.router, prefix="/tts", tags=["TTS"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "ishaara-ml"}
