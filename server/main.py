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

logger = logging.getLogger(__name__)
load_dotenv()

app = FastAPI(title="Scorpius")

ALLOWED_ORIGIN = os.getenv('ALLOWED_ORIGIN', 'http://localhost:5173')

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
clod_client = OpenAI(api_key=os.getenv('CLOD_API_KEY'),
                     base_url="https://api.clod.io/v1")


def process_image(image_data: bytes):
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Calculate current number of pixels
            current_pixels = img.width * img.height
            max_pixels = 33177600  # OpenAI's limit

            if current_pixels > max_pixels:
                scale = (max_pixels / current_pixels) ** 0.5
                new_width = int(img.width * scale)
                new_height = int(img.height * scale)
                img = img.resize((new_width, new_height),
                                 Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=95)
            image_data = buffer.getvalue()

            return True, base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        return False, f'''
        Error processing image: {str(e)}
        '''


async def analyze_image_data(image_data: bytes):
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
    try:
        print(f'''
        Analysis: {analysis}
        ''')
        print(f'''
        Using model: {model}
        ''')

        prompt = f'''
                    Task:
                    You will be given a description of a fictional character. Roast this character mercilessly.

                    Guidelines:
                    - Make your roasts brutally honest and emotionally impactful.
                    - Make sure your roasts cut deep and are personal to the traits of the individual.
                    - Focus on 2-3 key personality traits or physical features for maximum comedic effect.
                    - Strive for a balance of humor and emotional provocation.
                    - Keep your response around 700 characters.
                    - Use extremely profane and controversial language (without censoring any words) that is both funny and offensive.
                    - Be bold, witty, and unapologetically irreverent.
                    - Aim for roasts that are memorable, shareable, and likely to generate strong reactions.
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
    try:
        # List of available OpenAI TTS voices
        # voices = ["echo", "onyx"]
        # selected_voice = random.choice(voices)

        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=text
        )

        # Get the audio data
        audio_data = response.content

        # Convert to base64 for transmission
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        return {
            "audio": audio_base64,
            "voice": "onyx",
            "format": "mp3"
        }
    except Exception as e:
        print(f'''
        Error in text_to_speech: {str(e)}
        ''')
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f'''
            Error generating speech: {str(e)}
            ''')


class TTSRequest(BaseModel):
    text: str


@app.post("/roast")
async def roast_endpoint(
    file: UploadFile = File(...),
    model: str = Form(...)
):
    contents = await file.read()
    analysis = await analyze_image_data(contents)
    roast = await judge_image_data(analysis, model)
    return JSONResponse(content=roast)


@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    result = await text_to_speech(request.text)
    return JSONResponse(content=result)


@app.get("/")
async def root():
    return {"message": "Welcome to the Scorpius. Use /analyze or /roast endpoints to analyze images."}


@app.get("/models")
async def get_models():
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {os.getenv('CLOD_API_KEY')}"}
            async with session.get("https://api.clod.io/v1/providers/models", headers=headers) as response:
                if response.status != 200:
                    raise Exception(f'''
                    Failed to fetch models: {
                                    response.status}
                    ''')

                data = await response.json()
                return {"models": [model["systemName"] for model in data]}
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching models: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
