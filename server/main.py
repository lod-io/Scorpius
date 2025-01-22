import os
from openai import OpenAI
from dotenv import load_dotenv
from PIL import Image
import base64
import io
import aiohttp
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import logging
import time

# Setup logging
logger = logging.getLogger(__name__)
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Scorpius")

# Cache configuration for models list
models_cache = {
    "data": None,
    "timestamp": None
}

# Environment and configuration settings
ALLOWED_ORIGIN = os.getenv('ALLOWED_ORIGIN', 'http://localhost:5173')
CACHE_DURATION = 300  # 5 minutes in seconds

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API clients
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
clod_client = OpenAI(api_key=os.getenv('CLOD_API_KEY'),
                     base_url="https://api.clod.io/v1")


def validate_image(image_data: bytes) -> bool:
    """
    Validate if the uploaded file is a supported image format.

    Args:
        image_data: Raw bytes of the image file

    Returns:
        bool: True if valid image format, False otherwise
    """
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            return img.format.lower() in ['jpeg', 'jpg', 'png', 'webp']
    except Exception:
        return False


def process_image(image_data: bytes):
    """
    Process and optimize the image for OpenAI's vision API.

    Args:
        image_data: Raw bytes of the image file

    Returns:
        tuple: (success: bool, result: str) where result is either base64 encoded image or error message
    """
    if not validate_image(image_data):
        return False, "Invalid image format. Please upload a JPEG, PNG, or WebP image."

    try:
        with Image.open(io.BytesIO(image_data)) as img:
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize image if it exceeds OpenAI's pixel limit
            current_pixels = img.width * img.height
            max_pixels = 33177600  # OpenAI's limit

            if current_pixels > max_pixels:
                scale = (max_pixels / current_pixels) ** 0.5
                new_width = int(img.width * scale)
                new_height = int(img.height * scale)
                img = img.resize((new_width, new_height),
                                 Image.Resampling.LANCZOS)

            # Convert to JPEG and encode as base64
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=95)
            image_data = buffer.getvalue()

            return True, base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return False, f"Error processing image: {str(e)}"


async def analyze_image_data(image_data: bytes):
    """
    Analyze image using OpenAI's vision API to get a description.

    Args:
        image_data: Raw bytes of the image file

    Returns:
        str: Description of the image

    Raises:
        HTTPException: If image processing or analysis fails
    """
    success, result = process_image(image_data)
    if not success:
        raise HTTPException(status_code=400, detail=result)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": '''
                                This is an AI generated image. Describe the image. If a figure is present, describe this figure's most distinct characteristics. Be concise and objective.
                                '''
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{result}"
                            }
                        }
                    ]
                }
            ],
        )

        description = response.choices[0].message.content.strip()
        return description

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f'''
            Error analyzing image: {str(e)}
            ''')


async def judge_image_data(analysis: dict, model: str):
    """
    Generate a roast based on the image analysis using CLōD's API.

    Args:
        analysis: Description of the image
        model: Name of the CLōD model to use

    Returns:
        dict: Contains the generated roast

    Raises:
        HTTPException: If roast generation fails
    """
    try:

        # Define the roasting prompt
        prompt = f'''
                    Task:
                    You will be given a description of a fictional character. Roast this character like a comedian.

                    Guidelines:
                    - Make your roasts emotionally impactful and brutally honest to the specific traits of the character.
                    - Guess what persona the character is trying to pull off and call them out for it.
                    - Guess what the character's day-to-day life is like and call them out for it.
                    - Use profane and controversial language (without censoring any words) to support your roasts.
                    - Don't call the character bland, boring, or anything along those lines. Take advantage of their unique quirks.
                    - Do not use any generic, overused jokes. Create your own jokes and make them original.
                    - Your goal is to make everyone laugh.
                    - Keep your response around 600 characters.
                    '''

        response = clod_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": analysis
                }
            ],
            model=model,
            temperature=1.0,
            top_p=1.0,
        )

        return {"roast": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f'''
            Error analyzing image: {str(e)}
            ''')


async def text_to_speech(text: str):
    """
    Convert text to speech using OpenAI's TTS API.

    Args:
        text: Text to convert to speech

    Returns:
        dict: Contains base64 encoded audio data and metadata

    Raises:
        HTTPException: If TTS conversion fails
    """
    try:
        voice = random.choice(["onyx", "echo", "shimmer"])
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )

        # Get the audio data and convert to base64
        audio_data = response.content
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        return {
            "audio": audio_base64,
            "voice": voice,
            "format": "mp3"
        }
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating speech: {str(e)}")


# Pydantic models for request validation
class TTSRequest(BaseModel):
    text: str


class AnalysisRequest(BaseModel):
    analysis: str
    model: str


# API Endpoints
@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    """Endpoint to analyze an uploaded image"""
    contents = await file.read()
    analysis = await analyze_image_data(contents)
    return JSONResponse(content={"analysis": analysis})


@app.post("/judge")
async def judge_endpoint(request: AnalysisRequest):
    """Endpoint to generate a roast based on image analysis"""
    roast = await judge_image_data(request.analysis, request.model)
    return JSONResponse(content=roast)


@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    """Endpoint to convert text to speech"""
    result = await text_to_speech(request.text)
    return JSONResponse(content=result)


@app.get("/")
async def root():
    """Root endpoint providing API information"""
    return {
        "message": "Welcome to Scorpius API",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Analyze an image and get a description",
            "/judge": "POST - Get a roast based on an image analysis",
            "/tts": "POST - Convert text to speech",
            "/models": "GET - List available AI models"
        }
    }


@app.get("/models")
async def get_models():
    """
    Endpoint to get available CLōD models.
    Uses caching to reduce API calls.
    """
    try:
        # Check cache first
        current_time = time.time()
        if (models_cache["data"] is not None and
            models_cache["timestamp"] is not None and
                current_time - models_cache["timestamp"] < CACHE_DURATION):
            return {"models": models_cache["data"]}

        # Fetch fresh data if cache is expired
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {os.getenv('CLOD_API_KEY')}"}
            async with session.get("https://api.clod.io/v1/providers/models", headers=headers) as response:
                if response.status != 200:
                    if models_cache["data"] is not None:
                        logger.warning(
                            "Failed to fetch fresh models, using cached data")
                        return {"models": models_cache["data"]}
                    raise HTTPException(status_code=response.status,
                                        detail="Failed to fetch models")

                data = await response.json()
                model_list = [model["systemName"] for model in data]

                # Update cache
                models_cache["data"] = model_list
                models_cache["timestamp"] = current_time

                return {"models": model_list}
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        if models_cache["data"] is not None:
            logger.warning("Using cached models due to error")
            return {"models": models_cache["data"]}
        raise HTTPException(
            status_code=500, detail=f"Error fetching models: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
