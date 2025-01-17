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

            # Resize if image is too large
            if current_pixels > max_pixels:
                # Calculate the scaling factor
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
                                Identify their 3 most distinct facial characteristics.

                                Focus on:
                                - **Craniofacial morphology:** Note any significant variations in craniofacial proportions, such as an unusually large or small cranium, mandible, or nasal bridge.
                                - **Capillary and cutaneous features:** Describe the hair texture, color, and density, including any evidence of alopecia, canities, or hypertrichosis.
                                - **Facial symmetry and asymmetry:** Observe any deviations from bilateral symmetry in facial features, such as anisocoria, ptosis, or microtia.
                                - **Cutaneous manifestations:** Describe the skin texture, pigmentation, and the presence of any cutaneous lesions, such as acne vulgaris, rhytides, or lentigines.

                                Be concise and objective in your analysis.

                                Return only the objective description of the 3 most distinct observed facial characteristics. Avoid subjective interpretations or value judgments.
                                '''
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f'''
                                data:image/jpeg;base64,{result}
                                '''
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
                    You are a roastmaster. You possess a unique talent for delivering scathing, disrespectful roasts that are both entertaining and offensive.

                    You will be given a description of a person's face. Your task is to generate a humorous roast of this individual.
                    - Keep your responses concise, ideally around 600 characters.
                    - Employ extremely profane, offensive, and controversial language without any censorship.
                    - Be bold, witty, and unapologetically irreverent.
                    - Disrespect and rudeness are encouraged.
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
            model=model
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
        voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        selected_voice = random.choice(voices)

        print(f'''
        Generating speech for text: {text[:100]}...
        with voice: {selected_voice}
        ''')  # Log the input

        response = openai_client.audio.speech.create(
            model="tts-1",
            voice=selected_voice,
            input=text
        )

        # Get the audio data
        audio_data = response.content
        print(f'''
        Received audio data of size: {len(audio_data)} bytes
        ''')  # Log the response size

        # Convert to base64 for transmission
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        print(f'''
        Converted to base64 string of length: {len(audio_base64)}
        ''')  # Log the base64 length

        return {
            "audio": audio_base64,
            "voice": selected_voice,
            "format": "mp3"
        }
    except Exception as e:
        print(f'''
        Error in text_to_speech: {str(e)}
        ''')  # Log the full error
        import traceback
        print(traceback.format_exc())  # Print the full traceback
        raise HTTPException(
            status_code=500, detail=f'''
            Error generating speech: {str(e)}
            ''')


class TTSRequest(BaseModel):
    text: str


@app.post("/roast")
async def roast_endpoint(
    file: UploadFile = File(...),
    model: str = Form(...)  # Required field, no default value
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
                return {"models": [model["nameInProvider"] for model in data]}
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching models: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
