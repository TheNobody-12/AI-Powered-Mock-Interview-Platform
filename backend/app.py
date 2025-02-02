import os
import io
import json
import base64
import datetime
import jwt
import re
import sqlalchemy
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from google.cloud import speech, vision
from pydub import AudioSegment
from dotenv import load_dotenv
from kafka import KafkaProducer
import google.generativeai as genai

# -----------------------------------------------------------------------------
# Load environment variables from .env file
# -----------------------------------------------------------------------------
load_dotenv()

# Set Google Cloud credentials and configure Gemini AI (if provided)
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if GOOGLE_CREDENTIALS_PATH:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-pro")  # Initialize Gemini model  

# -----------------------------------------------------------------------------
# SQLite configuration (if needed for future storage; not used in this version)
# -----------------------------------------------------------------------------
DATABASE_URL = "sqlite:///mock.db"

# Flask secret key for sessions and JWT signing
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")

# -----------------------------------------------------------------------------
# Initialize Flask app, CORS, and SocketIO
# -----------------------------------------------------------------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
# (The DATABASE_URL is not used further since authentication is removed.)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# -----------------------------------------------------------------------------
# Set up Kafka Producer (for audio/video processing)
# -----------------------------------------------------------------------------
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',  # Adjust as needed for your Kafka broker
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# -----------------------------------------------------------------------------
# Global variables for live processing (transcription and emotion analysis)
# -----------------------------------------------------------------------------
latest_transcript = "Waiting for speech..."
latest_positivity_score = 0.5
latest_emotions = {}

# NEW: Global variable to accumulate candidate answer across audio segments
candidate_answer = ""

# -----------------------------------------------------------------------------
# Utility Functions for Audio/Video Processing
# -----------------------------------------------------------------------------
def convert_audio(audio_bytes):
    """
    Convert stereo audio (2 channels) to mono and resample to 16kHz.
    """
    audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    if audio.channels > 1:
        print("🎙 Converting stereo to mono...")
        audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)
    buffer = io.BytesIO()
    audio.export(buffer, format="wav")
    return buffer.getvalue()

def process_audio(audio_bytes):
    """
    Process audio using Google Cloud Speech-to-Text API and emit updates via Socket.IO.
    Accumulates candidate answer in a global variable.
    """
    global latest_transcript, candidate_answer
    try:
        mono_audio = convert_audio(audio_bytes)
        if mono_audio is None:
            return

        client = speech.SpeechClient()
        audio_config = speech.RecognitionAudio(content=mono_audio)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )
        response = client.recognize(config=config, audio=audio_config)
        if response.results:
           
            # Instead of overwriting, append each transcription segment.
           transcript_piece = response.results[0].alternatives[0].transcript
           candidate_answer += " " + transcript_piece  # accumulate for feedback later if needed
           print(f"📜 New Transcript Segment: {transcript_piece}")
           socketio.emit("update", {"transcript": transcript_piece})

    except Exception as e:
        print(f"❌ Error processing audio: {e}")
        socketio.emit("error", {"error": str(e)})

def process_video(image_bytes):
    """
    Process video frames for facial emotion analysis using Google Cloud Vision API.
    """
    global latest_positivity_score, latest_emotions
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        features = [vision.Feature(type_=vision.Feature.Type.FACE_DETECTION)]
        request_obj = vision.AnnotateImageRequest(image=image, features=features)
        response = client.annotate_image(request=request_obj)
        emotions = {}
        if response.face_annotations:
            face = response.face_annotations[0]
            emotions = {
                "joy": face.joy_likelihood,
                "anger": face.anger_likelihood,
                "sorrow": face.sorrow_likelihood,
                "surprise": face.surprise_likelihood,
            }
            positivity_score = (emotions.get("joy", 0) - emotions.get("anger", 0) - emotions.get("sorrow", 0)) / 4
            latest_positivity_score = round(positivity_score, 2)
            latest_emotions = emotions
            print(f"🌟 Positivity Score: {latest_positivity_score}")
            socketio.emit("update", {"emotions": emotions, "positivity_score": latest_positivity_score})
    except Exception as e:
        print(f"❌ Error processing video frame: {e}")
        socketio.emit("error", {"error": str(e)})

# -----------------------------------------------------------------------------
# Gemini AI Utility Functions
# -----------------------------------------------------------------------------
def extract_json_from_text(response_text):
    """Extract valid JSON from a text using regex."""
    match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return {"error": "Invalid JSON extracted"}
    return {"error": "No valid JSON found"}

def generate_questions(job_role, industry, job_description, question_type):
    """
    Generate interview questions using Gemini AI.
    Expects job details and returns a JSON object with questions.
    """
    if question_type.lower() == "behavioral":
        prompt = f"""
You are an expert interviewer. Generate exactly 10 scenario-based behavioral interview questions for a candidate applying for a {job_role} role in the {industry} industry.
Job Description: {job_description}
Return ONLY a valid JSON object in the following format:
{{
  "role": "{job_role}",
  "industry": "{industry}",
  "type": "Behavioral",
  "questions": [
    {{"id": 1, "question": "First behavioral question"}},
    ...,
    {{"id": 10, "question": "Tenth behavioral question"}}
  ]
}}
        """
    else:
        prompt = f"""
You are an expert interviewer. Generate exactly 10 technical interview questions for a candidate applying for a {job_role} role in the {industry} industry.
Job Description: {job_description}
Return ONLY a valid JSON object in the following format:
{{
  "role": "{job_role}",
  "industry": "{industry}",
  "type": "Technical",
  "questions": [
    {{"id": 1, "question": "First technical question"}},
    ...,
    {{"id": 10, "question": "Tenth technical question"}}
  ]
}}
        """
    response = model.generate_content(prompt)
    return extract_json_from_text(response.text)

def generate_feedback(transcript, question):
    """
    Generate feedback using Gemini AI based on the candidate's answer.
    Returns plain text feedback.
    """
    prompt = f"""
You are an expert interviewer. Provide detailed feedback for the candidate's answer.
Question: {question}
Candidate Answer (Transcript): {transcript}
Return only the feedback as plain text.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

# -----------------------------------------------------------------------------
# Flask Endpoints for Gemini AI Interactions
# -----------------------------------------------------------------------------
@app.route("/generate_questions", methods=["POST"])
def generate_questions_endpoint():
    data = request.get_json()
    job_role = data.get("jobRole")
    industry = data.get("industry")
    job_description = data.get("jobDescription")
    question_type = data.get("questionType", "Technical")
    if not job_role or not industry or not job_description:
        return jsonify({"error": "Missing required fields"}), 400
    questions = generate_questions(job_role, industry, job_description, question_type)
    return jsonify(questions)

@app.route("/get_feedback", methods=["POST"])
def get_feedback_endpoint():
    global candidate_answer
    data = request.get_json()
    question = data.get("question")
    # Use the accumulated candidate answer from audio processing
    if not candidate_answer or not question:
        return jsonify({"error": "Missing candidate answer or question"}), 400
    feedback = generate_feedback(candidate_answer, question)
    # Optionally, reset candidate_answer after feedback generation
    candidate_answer = ""
    return jsonify({"feedback": feedback})

# -----------------------------------------------------------------------------
# Flask Routes for Audio/Video Processing (Real-Time via Kafka & Socket.IO)
# -----------------------------------------------------------------------------
@app.route("/send_audio", methods=["POST"])
def send_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    encoded_audio = base64.b64encode(audio_bytes).decode('utf-8')
    producer.send('audio_topic', {'audio': encoded_audio})
    producer.flush()
    process_audio(audio_bytes)
    return jsonify({"message": "Audio received and sent to Kafka"}), 200

@app.route("/send_video", methods=["POST"])
def send_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    video_file = request.files['video']
    image_bytes = video_file.read()
    encoded_image = base64.b64encode(image_bytes).decode('utf-8')
    producer.send('video_topic', {'image': encoded_image})
    producer.flush()
    process_video(image_bytes)
    return jsonify({"message": "Video received and sent to Kafka"}), 200

@app.route("/get_transcript", methods=["GET"])
def get_transcript():
    return jsonify({"transcript": latest_transcript})

@app.route("/get_score", methods=["GET"])
def get_score():
    return jsonify({"positivity_score": latest_positivity_score})

# -----------------------------------------------------------------------------
# Main Section: Run the app with Socket.IO
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
