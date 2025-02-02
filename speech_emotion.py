import os
import io
import cv2
import numpy as np
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from google.cloud import speech, vision
import pyaudio

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Google Cloud Clients
speech_client = speech.SpeechClient()
vision_client = vision.ImageAnnotatorClient()

# Audio configuration
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms per frame

def transcribe_streaming(audio_generator):
    """Stream audio to Google Speech-to-Text API and yield transcriptions."""
    requests = (speech.StreamingRecognizeRequest(audio_content=chunk) for chunk in audio_generator)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code="en-US",
    )

    streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
    )

    responses = speech_client.streaming_recognize(streaming_config, requests)
    
    for response in responses:
        for result in response.results:
            if result.alternatives:
                yield result.alternatives[0].transcript

@socketio.on("audio_stream")
def handle_audio_stream(audio_data):
    """Receive audio from frontend, transcribe it in real-time, and send back text."""
    audio_bytes = np.frombuffer(audio_data, dtype=np.int16).tobytes()

    for transcript in transcribe_streaming([audio_bytes]):
        emit("transcription", {"transcript": transcript})

@socketio.on("image_stream")
def handle_image_stream(image_data):
    """Receive an image from frontend, analyze emotions, and send back scores."""
    image_bytes = np.frombuffer(image_data, dtype=np.uint8)
    image = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

    _, buffer = cv2.imencode('.jpg', image)
    image_content = buffer.tobytes()
    image = vision.Image(content=image_content)

    response = vision_client.face_detection(image=image)

    emotions = {"joy": 0, "anger": 0, "sorrow": 0, "surprise": 0}
    confidence_score = 0.0

    if response.face_annotations:
        face = response.face_annotations[0]
        emotions["joy"] = face.joy_likelihood
        emotions["anger"] = face.anger_likelihood
        emotions["sorrow"] = face.sorrow_likelihood
        emotions["surprise"] = face.surprise_likelihood

        confidence_score = (
            emotions["joy"] * 2 - emotions["anger"] - emotions["sorrow"]
        )

    emit("emotion_analysis", {"confidence_score": confidence_score, "emotions": emotions})

@app.route("/")
def index():
    return "Real-time Speech & Emotion Analysis API is Running"

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
