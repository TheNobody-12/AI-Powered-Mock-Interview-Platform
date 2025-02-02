import os
import io
import json
import base64
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from google.cloud import speech, vision
from pydub import AudioSegment
from dotenv import load_dotenv
from kafka import KafkaProducer

# ✅ Load environment variables
load_dotenv()
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH

# ✅ Flask Setup
app = Flask(__name__)
CORS(app)  # Allow CORS for all domains
socketio = SocketIO(app, cors_allowed_origins="*")

# ✅ Initialize global variables
latest_transcript = "Waiting for speech..."
latest_positivity_score = 0.5
latest_emotions = {}

# ✅ Set up Kafka Producer
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',  # Adjust the Kafka broker address as needed
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# ✅ Convert Stereo to Mono & Resample to 16kHz
def convert_audio(audio_bytes):
    """Converts stereo audio (2 channels) to mono (1 channel) and resamples to 16kHz."""
    audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    if audio.channels > 1:
        print("🎙 Converting stereo to mono...")
        audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)

    buffer = io.BytesIO()
    audio.export(buffer, format="wav")
    return buffer.getvalue()

# ✅ Process Audio & Emit via Socket.IO
def process_audio(audio_bytes):
    global latest_transcript
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

        transcript = ""
        if response.results:
            transcript = response.results[0].alternatives[0].transcript
            latest_transcript = transcript
            print(f"📜 Transcription: {transcript}")
            socketio.emit("update", {"transcript": transcript})
    except Exception as e:
        print(f"❌ Error processing audio: {e}")
        socketio.emit("error", {"error": str(e)})

# ✅ Process Video & Emit via Socket.IO
def process_video(image_bytes):
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

            # Compute a simple positivity score (customize as needed)
            positivity_score = (emotions.get("joy", 0) - emotions.get("anger", 0) - emotions.get("sorrow", 0)) / 4
            latest_positivity_score = round(positivity_score, 2)
            latest_emotions = emotions
            print(f"🌟 Positivity Score: {latest_positivity_score}")
            socketio.emit(
                "update",
                {"emotions": emotions, "positivity_score": latest_positivity_score}            )
    except Exception as e:
        print(f"❌ Error processing video frame: {e}")
        socketio.emit("error", {"error": str(e)})

# ✅ Socket.IO WebSocket Events
@socketio.on("connect")
def handle_connect():
    print("✅ Client connected to Socket.IO!")

@socketio.on("disconnect")
def handle_disconnect():
    print("❌ Socket.IO Client Disconnected")

# ✅ Flask Route for Audio Processing with Kafka
@app.route("/send_audio", methods=["POST"])
def send_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()

    # Optionally, publish the audio data to Kafka (encoded in base64)
    encoded_audio = base64.b64encode(audio_bytes).decode('utf-8')
    producer.send('audio_topic', {'audio': encoded_audio})
    producer.flush()

    # Process the audio immediately (or you can defer this to a Kafka consumer)
    process_audio(audio_bytes)
    return jsonify({"message": "Audio received and sent to Kafka"}), 200

# ✅ Flask Route for Video Processing with Kafka
@app.route("/send_video", methods=["POST"])
def send_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    video_file = request.files['video']
    image_bytes = video_file.read()

    # Optionally, publish the image data to Kafka (encoded in base64)
    encoded_image = base64.b64encode(image_bytes).decode('utf-8')
    producer.send('video_topic', {'image': encoded_image})
    producer.flush()

    process_video(image_bytes)
    return jsonify({"message": "Video received and sent to Kafka"}), 200

# ✅ REST API Endpoints for Polling Latest Results
@app.route("/get_transcript", methods=["GET"])
def get_transcript():
    return jsonify({"transcript": latest_transcript})

@app.route("/get_score", methods=["GET"])
def get_score():
    return jsonify({"positivity_score": latest_positivity_score})

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
