from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    whisper_model_size: str = "tiny"
    device: str = "cpu"
    compute_type: str = "int8"
    host: str = "0.0.0.0"
    port: int = 8001

    class Config:
        env_file = ".env"

settings = Settings()
