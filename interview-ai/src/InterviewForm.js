import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function InterviewForm({ setInterviewData }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    jobRole: "",
    industry: "",
    jobDescription: "",
    questionType: "Technical",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.jobRole || !formData.industry || !formData.jobDescription) {
      setError("All fields are required");
      return;
    }
    try {
      const response = await axios.post("http://127.0.0.1:5000/generate_questions", formData);
      setInterviewData({ ...formData, questions: response.data.questions });
      navigate("/interview");
    } catch (err) {
      console.error("Error generating questions:", err);
      setError("Failed to generate questions");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card mx-auto" style={{ maxWidth: "600px" }}>
        <div className="card-body">
          <h2 className="card-title mb-4">Interview Details</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="jobRole" className="form-label">Job Role</label>
              <input
                type="text"
                id="jobRole"
                name="jobRole"
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="industry" className="form-label">Industry</label>
              <input
                type="text"
                id="industry"
                name="industry"
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="jobDescription" className="form-label">Job Description</label>
              <textarea
                id="jobDescription"
                name="jobDescription"
                onChange={handleChange}
                className="form-control"
                rows="4"
                required
              ></textarea>
            </div>
            <div className="mb-3">
              <label htmlFor="questionType" className="form-label">Question Type</label>
              <select
                id="questionType"
                name="questionType"
                onChange={handleChange}
                className="form-select"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-100">Generate Questions</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InterviewForm;
