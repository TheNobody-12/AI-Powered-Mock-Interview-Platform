import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./InterviewForm.css";

function InterviewForm({ setInterviewData }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [formData, setFormData] = useState({
    jobRole: "",
    company: "",
    jobDescription: "",
    companyWebsite: "",
    questionType: "Technical",
    experienceLevel: "Mid",
    resume: null
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.jobRole || !formData.jobDescription || !formData.resume) {
      setError("Job role, description, and resume are required");
      setIsLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('resume', formData.resume);
      data.append('jobRole', formData.jobRole);
      data.append('company', formData.company);
      data.append('jobDescription', formData.jobDescription);
      data.append('companyWebsite', formData.companyWebsite);
      data.append('questionType', formData.questionType);
      data.append('experienceLevel', formData.experienceLevel);

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await axios.post(
        "http://127.0.0.1:5000/generate_questions",
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        }
      );

      // No need to parse JSON here since backend now returns proper JSON
    setInterviewData({
      ...formData,
      questions: response.data.questions, // Directly use the array
      resumeInsights: response.data.resume_insights,
      currentQuestionIndex: 0,
      answers: [],
      feedback: null
    });

      navigate("/interview");
    } catch (err) {
      console.error("Error generating questions:", err);
      setError(err.response?.data?.error ||
        "Failed to generate questions. Please try again.");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="interview-form-container">
      <div className="interview-form-card">
        <div className="form-header">
          <h2>Configure Your Mock Interview</h2>
          <p className="subtitle">
            Get personalized questions based on your resume and target position
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="interview-form">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="jobRole" className="form-label">Target Job Role *</label>
              <input
                type="text"
                id="jobRole"
                name="jobRole"
                value={formData.jobRole}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Software Engineer, Data Scientist"
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="company" className="form-label">Company Name</label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Google, Amazon"
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="jobDescription" className="form-label">Job Description *</label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              className="form-control"
              rows="5"
              placeholder="Paste the job description or key requirements..."
              required
            ></textarea>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="companyWebsite" className="form-label">Company Website</label>
              <input
                type="url"
                id="companyWebsite"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleChange}
                className="form-control"
                placeholder="https://company.com/careers"
              />
              <small className="text-muted">We'll analyze the company culture and values</small>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="experienceLevel" className="form-label">Experience Level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Entry">Entry Level</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior Level</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="questionType" className="form-label">Question Type</label>
              <select
                id="questionType"
                name="questionType"
                value={formData.questionType}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Mixed">Mixed (Technical + Behavioral)</option>
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="resume" className="form-label">Upload Resume (PDF)*</label>
              <input
                type="file"
                id="resume"
                name="resume"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="form-control"
                accept=".pdf"
                required
              />
              <small className="text-muted">PDF or Word document (We'll extract relevant skills)</small>
            </div>
          </div>


          <div className="form-footer">
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Generating Questions ({progress}%)
                </>
              ) : (
                <>
                  <span className="icon">🚀</span>
                  Generate Questions
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterviewForm;