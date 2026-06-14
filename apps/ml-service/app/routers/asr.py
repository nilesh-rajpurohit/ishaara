from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
import tempfile, os

router = APIRouter()
model = None

def get_model():
    global model
    if model is None:
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return model

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = None):
    try:
        suffix = ".webm"
        if file.filename:
            ext = os.path.splitext(file.filename)[1]
            if ext: suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        whisper = get_model()
        segments, info = whisper.transcribe(
            tmp_path,
            language=language if language else None,
            beam_size=5,
        )
        text = " ".join([s.text.strip() for s in segments])
        os.unlink(tmp_path)

        return {
            "text": text.strip(),
            "language": info.language,
            "confidence": round(info.language_probability, 3)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
