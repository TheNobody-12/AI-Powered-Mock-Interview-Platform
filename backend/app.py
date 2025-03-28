from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from pypdf import PdfReader
import re
import chromadb
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile
import io
import base64
from google.cloud import speech, vision
from pydub import AudioSegment
from kafka import KafkaProducer, KafkaConsumer
import threading
import time
import traceback
from datetime import datetime
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import requests
from face_analysis import FaceAnalyzer
import numpy as np
import cv2


load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")  # Changed to threading mode

# Initialize the analyzer
face_analyzer = FaceAnalyzer()


# Configure upload folder
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configure Google services
if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Initialize Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-1.5-pro")

# Initialize Kafka
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Global variables for live interview
latest_transcript = ""
candidate_answer = ""
latest_positivity_score = 0.5
current_question_index = 0
interview_questions = []

class GeminiEmbeddingFunction:
    def __call__(self, input):
        return genai.embed_content(
            model="models/embedding-001",
            content=input,
            task_type="retrieval_document",
            title="Custom query"
        )["embedding"]
    
def is_valid_url(url):
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False

def scrape_company_info(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'footer']):
            element.decompose()
        
        # Get text from main content areas
        text = ' '.join([p.get_text() for p in soup.find_all(['p', 'h1', 'h2', 'h3'])])
        return text[:5000]  # Limit to first 5000 chars
    except Exception as e:
        print(f"Error scraping company page: {e}")
        return ""

def process_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return re.split('\n \n', text)

def create_chroma_db(documents, path, name):
    chroma_client = chromadb.PersistentClient(path=path)
    try:
        chroma_client.delete_collection(name)
    except: pass
    
    db = chroma_client.create_collection(
        name=name,
        embedding_function=GeminiEmbeddingFunction()
    )
    for i, d in enumerate(documents):
        db.add(documents=d, ids=str(i))
    return db

def generate_questions_with_rag(db, form_data):
    try:
        # Step 1: Retrieve relevant context
        query = f"{form_data['jobRole']} {form_data['questionType']} interview questions"
        relevant_text = db.query(query_texts=[query], n_results=5)['documents'][0]
        
        # Step 2: Generate questions with chain of thought
        prompt = f"""
You are an AI specialized in generating structured interview questions. Your task is to generate **exactly 10** questions for a **{form_data['experienceLevel']} {form_data['jobRole']}** position at **{form_data['company']}**.

### **Input Information:**
- **Job Role:** {form_data['jobRole']}
- **Company:** {form_data['company']}
- **Experience Level:** {form_data['experienceLevel']}
- **Question Type:** {form_data['questionType']} (e.g., Technical, Behavioral)
- **Job Description:** {form_data['jobDescription']}
- **Candidate Resume Highlights:** {" ".join(relevant_text)}

### **Instructions:**
1. **Analyze the Job Description & Resume**: Identify key skills, requirements, and responsibilities.
2. **Generate Questions**: Create exactly **10** questions that:
   - Match the **{form_data['questionType']}** category.
   - Are tailored to the job role and experience level.
   - Include a mix of conceptual, problem-solving, and scenario-based questions.

### **Output Format:**
Return only **valid JSON** in the following format, with **exactly** 10 questions:
```json
{{
  "questions": [
    {{"id": 1, "question": "First {form_data['questionType'].lower()} question"}},
    {{"id": 2, "question": "Second {form_data['questionType'].lower()} question"}},
    {{"id": 3, "question": "Third {form_data['questionType'].lower()} question"}},
    {{"id": 4, "question": "Fourth {form_data['questionType'].lower()} question"}},
    {{"id": 5, "question": "Fifth {form_data['questionType'].lower()} question"}},
    {{"id": 6, "question": "Sixth {form_data['questionType'].lower()} question"}},
    {{"id": 7, "question": "Seventh {form_data['questionType'].lower()} question"}},
    {{"id": 8, "question": "Eighth {form_data['questionType'].lower()} question"}},
    {{"id": 9, "question": "Ninth {form_data['questionType'].lower()} question"}},
    {{"id": 10, "question": "Tenth {form_data['questionType'].lower()} question"}}
  ]
}}
        """

        
        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean response
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].strip()
        
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Error in question generation: {e}")
        raise

#  Modify the process_video function
def process_video(image_bytes):
    global latest_positivity_score
    
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("Could not decode image")
            
        # Analyze the frame
        analysis = face_analyzer.analyze_frame(frame)
        
        # Get smoothed scores
        engagement_score, positivity_score = face_analyzer.get_smoothed_scores()
        
        # Update global variables
        latest_positivity_score = positivity_score
        
        # Send updates via Kafka
        producer.send('interview_updates', {
            'engagement_score': engagement_score,
            'positivity_score': positivity_score,
            'emotion': analysis['emotion'],
            'timestamp': datetime.now().isoformat()
        })
        
        return True
        
    except Exception as e:
        producer.send('interview_errors', {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        })
        return False

# Add a new endpoint to get current engagement metrics
@app.route('/get_engagement_metrics', methods=['GET'])
def get_engagement_metrics():
    engagement, positivity = face_analyzer.get_smoothed_scores()
    return jsonify({
        'engagement_score': engagement,
        'positivity_score': positivity,
        'timestamp': datetime.now().isoformat()
    })

# Modify the Kafka consumer to handle engagement updates
def kafka_consumer():
    consumer = KafkaConsumer(
        'interview_updates',
        bootstrap_servers=KAFKA_BROKER,
        auto_offset_reset='latest',
        value_deserializer=lambda x: json.loads(x.decode('utf-8')))
    
    for message in consumer:
        data = message.value
        if 'transcript' in data:
            socketio.emit('update', {
                'type': 'transcript',
                'data': data['transcript']
            })
        elif 'engagement_score' in data:
            socketio.emit('update', {
                'type': 'metrics',
                'data': {
                    'engagement': data['engagement_score'],
                    'positivity': data['positivity_score'],
                    'emotion': data.get('emotion', 'neutral')
                }
            })

# Start Kafka consumer in a separate thread
kafka_thread = threading.Thread(target=kafka_consumer)
kafka_thread.daemon = True
kafka_thread.start()

# Audio/Video Processing Functions
def convert_audio(audio_bytes):
    audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    if audio.channels > 1:
        audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)
    buffer = io.BytesIO()
    audio.export(buffer, format="wav")
    return buffer.getvalue()

def process_audio(audio_bytes):
    global latest_transcript, candidate_answer
    try:
        mono_audio = convert_audio(audio_bytes)
        producer.send('audio_stream', {'audio': base64.b64encode(mono_audio).decode('utf-8')})
        
        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=mono_audio)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )
        response = client.recognize(config=config, audio=audio)
        if response.results:
            transcript_piece = response.results[0].alternatives[0].transcript
            candidate_answer += " " + transcript_piece
            producer.send('interview_updates', {
                'transcript': transcript_piece,
                'positivity_score': latest_positivity_score
            })
    except Exception as e:
        producer.send('interview_errors', {'error': str(e)})

# def process_video(image_bytes):
#     global latest_positivity_score
#     try:
#         producer.send('video_stream', {'image': base64.b64encode(image_bytes).decode('utf-8')})
        
#         client = vision.ImageAnnotatorClient()
#         image = vision.Image(content=image_bytes)
#         response = client.face_detection(image=image)
#         if response.face_annotations:
#             face = response.face_annotations[0]
#             emotions = {
#                 "joy": face.joy_likelihood,
#                 "anger": face.anger_likelihood,
#                 "sorrow": face.sorrow_likelihood,
#             }
#             positivity_score = (emotions["joy"] - emotions["anger"] - emotions["sorrow"]) / 4
#             latest_positivity_score = max(0, min(1, positivity_score))
#             producer.send('interview_updates', {'positivity_score': latest_positivity_score})
#     except Exception as e:
#         producer.send('interview_errors', {'error': str(e)})

#  Routes
@app.route('/generate_questions', methods=['POST'])
def generate_questions_endpoint():
    global interview_questions, current_question_index
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
        
    file = request.files['resume']
    if not file or not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file type - only PDF accepted"}), 400

    try:
        # Save resume
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Get form data
        form_data = {
            'jobRole': request.form.get('jobRole', '').strip(),
            'company': request.form.get('company', '').strip(),
            'jobDescription': request.form.get('jobDescription', '').strip(),
            'questionType': request.form.get('questionType', 'Technical').strip(),
            'experienceLevel': request.form.get('experienceLevel', 'Mid-level').strip(),
            'companyWebsite': request.form.get('companyWebsite', '').strip()
        }
        
        # Validate required fields
        if not all([form_data['jobRole'], form_data['company'], form_data['jobDescription']]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Process resume and company info
        resume_text = process_pdf(filepath)
        company_text = scrape_company_info(form_data['companyWebsite']) if is_valid_url(form_data['companyWebsite']) else ""
        all_documents = resume_text + [company_text] if company_text else resume_text
        
        # Create vector store
        db = create_chroma_db(all_documents, app.config['UPLOAD_FOLDER'], "interview_data")
        
        # Generate questions using RAG
        questions_data = generate_questions_with_rag(db, form_data)
        
        # Validate questions
        if not questions_data.get('questions'):
            raise ValueError("No questions generated")
            
        interview_questions = questions_data['questions']
        current_question_index = 0
        
        return jsonify({
            "success": True,
            "category": questions_data.get('category', form_data['questionType']),
            "questions": interview_questions,
            "currentQuestionIndex": 0,
            "message": "Questions generated successfully"
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            "error": "Failed to parse AI response",
            "details": str(e)
        }), 500
    except ValueError as e:
        return jsonify({
            "error": "Invalid question format",
            "details": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "error": "Failed to generate questions",
            "details": str(e)
        }), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route('/send_audio', methods=['POST'])
def handle_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    threading.Thread(target=process_audio, args=(request.files['audio'].read(),)).start()
    return jsonify({"status": "processing"})

@app.route('/send_video', methods=['POST'])
def handle_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file"}), 400
    threading.Thread(target=process_video, args=(request.files['video'].read(),)).start()
    return jsonify({"status": "processing"})
@app.route('/analyze_response', methods=['POST'])
def analyze_response():
    """Process the candidate's response and generate feedback."""
    try:
        # Ensure correct request format
        data = request.get_json()
        if not data or 'question' not in data or 'response' not in data:
            return jsonify({
                "status": "error",
                "error": "Invalid request format. Required fields: 'question', 'response'."
            }), 400

        question = data['question'][:1000]  # Limit length for safety
        response = data['response'][:5000]  # Limit length for safety

        # Gemini API prompt
        prompt = f"""
        Analyze this interview question and response:

        QUESTION: {question}
        RESPONSE: {response}

        Provide feedback in this exact JSON format:
        {{
            "concise_feedback": "Brief summary of performance",
            "technical_score": 1-5,
            "communication_score": 1-5,
            "overall_score": 1-100,
            "strengths": ["list", "of", "strengths"],
            "improvements": ["list", "of", "improvements"],
            "suggested_answer": "Example of good answer"
        }}

        IMPORTANT: Only return valid JSON, no additional text or markdown.
        """

        # Call Gemini API with timeout
        try:
            genai_response = gemini_model.generate_content(
                prompt,
                generation_config={"temperature": 0.3}
            )
            
            # Clean the response
            response_text = genai_response.text.strip()
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].strip()
            
            feedback = json.loads(response_text)
            
            # Validate response structure
            required_fields = [
                "concise_feedback", "technical_score", 
                "communication_score", "overall_score",
                "strengths", "improvements", "suggested_answer"
            ]
            
            if not all(field in feedback for field in required_fields):
                raise ValueError("AI response missing required fields")
                
            return jsonify({
                "status": "success",
                "feedback": feedback
            })

        except json.JSONDecodeError as e:
            return jsonify({
                "status": "error",
                "error": "Invalid JSON response from AI",
                "details": str(e),
                "raw_response": genai_response.text if 'genai_response' in locals() else None
            }), 500
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "error": "Failed to process AI response",
                "details": str(e)
            }), 500

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": "Server error while processing feedback",
            "details": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/current_question', methods=['GET'])
def get_current_question():
    return jsonify({
        "question": interview_questions[current_question_index] if interview_questions else "",
        "index": current_question_index,
        "total": len(interview_questions)
    })

if __name__ == '__main__':
    # Disable reloader to avoid socket conflicts
    socketio.run(app, debug=True, port=5000, use_reloader=False)