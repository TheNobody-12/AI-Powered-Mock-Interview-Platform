import re
import json
from flask import Flask, request, jsonify
import google.generativeai as genai
import fitz  # PyMuPDF for PDF processing
import os

app = Flask(__name__)


# Get API key from .env file
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Ensure API key is set
if not GEMINI_API_KEY:
    raise ValueError("Missing API key! Please set GEMINI_API_KEY in .env file.")
# Configure Google Gemini API
genai.configure(api_key= GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file using PyMuPDF."""
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()

def extract_json_from_text(response_text):
    """Extract valid JSON from Gemini AI's response using regex."""
    match = re.search(r'\{.*\}', response_text, re.DOTALL)  # Extracts text between `{}` (JSON block)
    if match:
        try:
            return json.loads(match.group())  # Convert to JSON
        except json.JSONDecodeError:
            return {"error": "Extracted content is not valid JSON"}
    return {"error": "No valid JSON found in AI response"}

def generate_questions(job_role, industry, job_description, key_skills, question_type):
    """Generates AI-powered interview questions dynamically using Gemini AI."""
    
    model = genai.GenerativeModel("gemini-pro")  # Initialize Gemini model  

    # Select appropriate prompt
    if question_type.lower() == "behavioral":
        prompt = f"""
        You are an expert interviewer designing behavioral interview questions for a candidate applying for the role of {job_role} in {industry}.
        
        Generate **10 scenario-based behavioral interview questions** that evaluate **problem-solving, teamwork, and communication skills**.

        ✅ **Tailor the questions based on this job description**:  
        {job_description}
        
        ✅ **Ensure questions assess key competencies relevant to this role, including**:  
        1️⃣ Handling **high-pressure situations or tight deadlines**.  
        2️⃣ Managing **challenges related to {key_skills}**.  
        3️⃣ Communicating **complex ideas to non-technical stakeholders**.  
        4️⃣ Resolving **team conflicts or collaboration challenges**.  
        5️⃣ Implementing **strategies for process automation and efficiency**.  

        📌 **Return ONLY a valid JSON response, without any additional text. The JSON structure must be:**  

        ```json
        {{
          "role": "{job_role}",
          "industry": "{industry}",
          "type": "Behavioral",
          "questions": [
            {{"id": 1, "question": "First behavioral question"}},
            {{"id": 2, "question": "Second behavioral question"}},
            ...
            {{"id": 10, "question": "Tenth behavioral question"}}
          ]
        }}
        ```
        """

    else:
        prompt = f"""
        You are an expert technical interviewer creating **10 advanced technical interview questions** for a **{job_role}** in **{industry}**.  

        ✅ **Tailor the questions based on this job description**:  
        {job_description}  

        ✅ **Ensure questions assess essential skills, including**:  
        1️⃣ **Handling and processing data efficiently** (if applicable).  
        2️⃣ **Problem-solving using {key_skills}**.  
        3️⃣ **Optimizing system performance, algorithms, or processes**.  
        4️⃣ **Debugging and troubleshooting real-world issues**.  
        5️⃣ **Automating workflows using relevant technologies**.  

        📌 **Return ONLY a valid JSON response, without any additional text. The JSON structure must be:**  

        ```json
        {{
          "role": "{job_role}",
          "industry": "{industry}",
          "type": "Technical",
          "questions": [
            {{"id": 1, "question": "First technical question"}},
            {{"id": 2, "question": "Second technical question"}},
            ...
            {{"id": 10, "question": "Tenth technical question"}}
          ]
        }}
        ```
        """

    response = model.generate_content(prompt)  # Generate AI content  

    # Extract only the JSON portion from AI response
    return extract_json_from_text(response.text)

@app.route('/generate_questions', methods=['POST'])
def generate_questions_api():
    """API to generate interview questions from job description (Text or PDF)."""
    
    job_role = request.form.get("job_role")  # Job title
    industry = request.form.get("industry")  # Industry type
    key_skills = request.form.get("key_skills")  # Key skills
    question_type = request.form.get("question_type")  # 'Technical' or 'Behavioral'
    file = request.files.get("file")  # PDF file

    if file and file.filename.endswith(".pdf"):
        temp_path = f"./{file.filename}"
        file.save(temp_path)
        job_description = extract_text_from_pdf(temp_path)
        os.remove(temp_path)  # Cleanup
    else:
        job_description = request.form.get("job_description")  # Manual input

    if not job_role or not industry or not key_skills or not question_type or not job_description:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Generate questions based on the job description
    questions = generate_questions(job_role, industry, job_description, key_skills, question_type)
    
    return jsonify(questions)

if __name__ == '__main__':
    app.run(debug=True)
