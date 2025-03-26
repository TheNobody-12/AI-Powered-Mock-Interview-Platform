import React from 'react';
import './Feedback.css';

const Feedback = ({ feedback }) => {
  if (!feedback) return null;

  // Handle both direct feedback objects and API responses
  const feedbackData = feedback.feedback || feedback;

  return (
    <div className="feedback-container">
      <h2 className="feedback-header">AI Feedback Analysis</h2>
      
      {feedbackData.concise_feedback && (
        <div className="feedback-summary">
          <h3>Summary</h3>
          <p>{feedbackData.concise_feedback}</p>
        </div>
      )}

      <div className="feedback-scores">
        <div className="score-card">
          <span className="score-label">Technical</span>
          <span className="score-value">{feedbackData.technical_score}/5</span>
        </div>
        <div className="score-card">
          <span className="score-label">Communication</span>
          <span className="score-value">{feedbackData.communication_score}/5</span>
        </div>
        <div className="score-card overall">
          <span className="score-label">Overall</span>
          <span className="score-value">{feedbackData.overall_score}/100</span>
        </div>
      </div>

      {feedbackData.strengths?.length > 0 && (
        <div className="feedback-section strengths">
          <h3>Strengths</h3>
          <ul>
            {feedbackData.strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {feedbackData.improvements?.length > 0 && (
        <div className="feedback-section improvements">
          <h3>Areas for Improvement</h3>
          <ul>
            {feedbackData.improvements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Feedback;