import os
from openai import OpenAI
from dotenv import load_dotenv
from PIL import Image
import base64
import io
import json
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import random
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
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))


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
        return False, f"Error processing image: {str(e)}"


# async def analyze_image_data(image_data: bytes):
#     success, result = process_image(image_data)
#     if not success:
#         raise HTTPException(status_code=400, detail=result)

#     try:
#         response = client.chat.completions.create(
#             model="gpt-4o-mini",
#             messages=[
#                 {
#                     "role": "user",
#                     "content": [
#                         {
#                             "type": "text",
#                             "text": '''
#                                     Analyze the person's face in the image and provide a detailed classification of their facial characteristics in JSON format. Make your best guess for ALL fields - do not use "Not specified", "None", or similar placeholder values.

#                                     Return a raw JSON object with the following structure:

#                                     {
#                                         "face_shape": string,  // e.g. "oval", "round", "square", "heart", "diamond"
#                                         "hair": {
#                                             "color": string,
#                                             "texture": string,  // e.g. "straight", "wavy", "curly", "coily"
#                                             "thickness": string,
#                                             "length": string,
#                                             "style": string,
#                                             "hairline": string,
#                                             "hair_loss_pattern": string,
#                                             "hair_health": string,
#                                             "gray_percentage": number  // 0-100
#                                         },
#                                         "ears": {
#                                             "size": string,
#                                             "shape": string,
#                                             "attachment": string,  // "attached" or "detached"
#                                             "lobe_type": string,  // "attached" or "free"
#                                             "symmetry": boolean,
#                                             "protrusion": string,  // how much they stick out
#                                             "piercings": boolean
#                                         },
#                                         "skin_features": {
#                                             "complexion": string,
#                                             "texture": string,
#                                             "visible_pores": boolean,
#                                             "blemishes": boolean,
#                                             "wrinkles_level": string
#                                         },
#                                         "eyes": {
#                                             "shape": string,
#                                             "color": string,
#                                             "size": string,
#                                             "eye_spacing": string,
#                                             "eyebrow_thickness": string,
#                                             "dark_circles": boolean,
#                                             "eye_bags": boolean
#                                         },
#                                         "nose": {
#                                             "shape": string,
#                                             "size": string,
#                                             "bridge": string,
#                                             "tip": string,
#                                             "nostrils": string
#                                         },
#                                         "lips": {
#                                             "shape": string,
#                                             "fullness": string,
#                                             "lip_lines": boolean,
#                                             "cupids_bow": string
#                                         },
#                                         "facial_symmetry": {
#                                             "overall_rating": number,  // 1-10 scale
#                                             "notable_asymmetries": []
#                                         },
#                                         "distinctive_features": {
#                                             "moles": boolean,
#                                             "freckles": boolean,
#                                             "scars": boolean,
#                                             "dimples": boolean,
#                                             "facial_hair": string
#                                         },
#                                         "facial_structure": {
#                                             "cheekbone_prominence": string,
#                                             "jaw_definition": string,
#                                             "chin_shape": string,
#                                             "forehead_height": string
#                                         },
#                                         "perceived_age_indicators": {
#                                             "estimated_age": number,
#                                             "aging_signs": []
#                                         }
#                                     }

#                                     Important:
#                                     1. Make a best guess for EVERY field - no "Not specified" or similar placeholders
#                                     2. Use visual cues and patterns to make educated guesses
#                                     3. Return only the raw JSON object without any markdown formatting or additional text
#                                     4. Be precise and detailed in describing each facial feature
#                                     '''
#                         },
#                         {
#                             "type": "image_url",
#                             "image_url": {
#                                 "url": f"data:image/jpeg;base64,{result}"
#                             }
#                         }
#                     ]
#                 }
#             ],
#         )

#         raw_response = response.choices[0].message.content
#         try:
#             result = json.loads(raw_response)
#             return result
#         except json.JSONDecodeError:
#             raise HTTPException(
#                 status_code=500, detail="Error: Response was not in valid JSON format")

#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Error analyzing image: {str(e)}")


async def judge_image_data(image_data: bytes):
    success, result = process_image(image_data)
    if not success:
        raise HTTPException(status_code=400, detail=result)

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f'''
                            - Generate a humorous and lighthearted roast of the person in the input image.
                            - The tone should be playful and teasing, similar to a comedy roast.
                            - Be creative and focus on the person's facial features, expression, and overall appearance.
                            - Use witty one-liners, clever wordplay, and comedic observations to craft a roast that is entertaining and amusing.
                            - Please avoid being mean-spirited or hurtful, and ensure the roast is respectful and suitable for a general audience.
                            - The goal is to poke fun at the person in a lighthearted and humorous way, not to offend or insult them.
                            - Skip any descriptions or introductions - deliver only the roast itself.
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
            model="llama-3.2-11b-vision-preview"
        )

        return {"roast": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error analyzing image: {str(e)}")


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
            status_code=500, detail=f"Error generating speech: {str(e)}")


class TTSRequest(BaseModel):
    text: str


# @app.post("/analyze")
# async def analyze_endpoint(file: UploadFile = File(...)):
#     contents = await file.read()
#     result = await analyze_image_data(contents)
#     return JSONResponse(content=result)


@app.post("/roast")
async def roast_endpoint(
    file: UploadFile = File(...)
):
    contents = await file.read()
    result = await judge_image_data(contents)
    return JSONResponse(content=result)


@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    result = await text_to_speech(request.text)
    return JSONResponse(content=result)


@app.get("/")
async def root():
    return {"message": "Welcome to the Scorpius. Use /analyze or /roast endpoints to analyze images."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
