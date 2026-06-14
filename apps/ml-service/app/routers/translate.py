from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from langdetect import detect

router = APIRouter()

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"

@router.post("/text")
async def translate_text(req: TranslateRequest):
    try:
        source = req.source_lang
        if source == "auto":
            source = detect(req.text)
        translator = GoogleTranslator(source=source, target=req.target_lang)
        translated = translator.translate(req.text)
        return {"original_text": req.text, "translated_text": translated, "source_lang": source, "target_lang": req.target_lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
def get_languages():
    return {"supported_languages": {"hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi", "ta": "Tamil", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi", "en": "English"}}
