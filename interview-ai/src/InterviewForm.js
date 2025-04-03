import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./InterviewForm.css";

function InterviewForm({ setInterviewData }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const [formData, setFormData] = useState({
    jobRole: "",
    company: "",
    jobDescription: "",
    companyWebsite: "",
    questionType: "Technical",
    experienceLevel: "Mid",
    resume: null
  });

  const [errors, setErrors] = useState({
    jobRole: "",
    jobDescription: "",
    resume: ""
  });

  // Validate form whenever formData changes
  useEffect(() => {
    const isValid = (
      formData.jobRole.trim() &&
      formData.jobDescription.trim() &&
      formData.resume
    );
    setIsFormValid(isValid);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setFileError("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File size should be less than 5MB");
      return;
    }

    setFormData(prev => ({ ...prev, resume: file }));
    setErrors(prev => ({ ...prev, resume: "" }));
  };

  const validateForm = () => {
    const newErrors = {
      jobRole: !formData.jobRole.trim() ? "Job role is required" : "",
      jobDescription: !formData.jobDescription.trim() ? "Job description is required" : "",
      resume: !formData.resume ? "Resume is required" : ""
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setProgress(0);

    try {
      const data = new FormData();
      data.append('resume', formData.resume);
      data.append('jobRole', formData.jobRole);
      data.append('company', formData.company);
      data.append('jobDescription', formData.jobDescription);
      data.append('companyWebsite', formData.companyWebsite);
      data.append('questionType', formData.questionType);
      data.append('experienceLevel', formData.experienceLevel);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
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

      clearInterval(progressInterval);
      setProgress(100);

      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));

      setInterviewData({
        ...formData,
        questions: response.data.questions,
        resumeInsights: response.data.resume_insights,
        currentQuestionIndex: 0,
        answers: [],
        feedback: null
      });

      navigate("/interview");
    } catch (err) {
      console.error("Error generating questions:", err);
      const errorMessage = err.response?.data?.error ||
        err.message ||
        "Failed to generate questions. Please try again.";
      
      setErrors(prev => ({ ...prev, general: errorMessage }));
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

        {errors.general && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.general}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="interview-form">
          <div className="row">
            <div className="form-group">
              <label htmlFor="jobRole">Target Job Role *</label>
              <input
                type="text"
                id="jobRole"
                name="jobRole"
                value={formData.jobRole}
                onChange={handleChange}
                className={`form-control ${errors.jobRole ? 'error' : ''}`}
                placeholder="e.g. Software Engineer, Data Scientist"
              />
              {errors.jobRole && (
                <div className="error-message">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.jobRole}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="company">Company Name</label>
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

          <div className="form-group">
            <label htmlFor="jobDescription">Job Description *</label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              className={`form-control ${errors.jobDescription ? 'error' : ''}`}
              rows="5"
              placeholder="Paste the job description or key requirements..."
            ></textarea>
            {errors.jobDescription && (
              <div className="error-message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.jobDescription}
              </div>
            )}
          </div>

          <div className="row">
            <div className="form-group">
              <label htmlFor="companyWebsite">Company Website</label>
              <input
                type="url"
                id="companyWebsite"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleChange}
                className="form-control"
                placeholder="https://company.com/careers"
              />
              <small className="form-hint">We'll analyze the company culture and values</small>
            </div>

            <div className="form-group">
              <label htmlFor="experienceLevel">Experience Level</label>
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
            <div className="form-group">
              <label htmlFor="questionType">Question Type</label>
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

            <div className="form-group">
              <label htmlFor="resume">Upload Resume (PDF or Word)*</label>
              <div className="file-input-container">
                <input
                  type="file"
                  id="resume"
                  name="resume"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={`form-control ${errors.resume || fileError ? 'error' : ''}`}
                  accept=".pdf,.doc,.docx"
                />
                {formData.resume && (
                  <div className="file-selected">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formData.resume.name}
                  </div>
                )}
              </div>
              {(errors.resume || fileError) && (
                <div className="error-message">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.resume || fileError}
                </div>
              )}
              <small className="form-hint">PDF or Word document (max 5MB)</small>
            </div>
          </div>

          <div className="form-footer">
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Generating Questions ({Math.round(progress)}%)
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