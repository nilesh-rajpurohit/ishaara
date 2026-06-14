from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "hi"

@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    return {"status": "ok", "message": "TTS coming in Phase 5", "text": req.text, "language": req.language}
