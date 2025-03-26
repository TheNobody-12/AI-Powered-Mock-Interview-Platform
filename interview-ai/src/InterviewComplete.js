import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './InterviewComplete.css';

const InterviewComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewData = {}, feedbackData = [] } = location.state || {};

  // Calculate average scores
  const averageScores = feedbackData.reduce(
    (acc, feedback) => {
      if (feedback) {
        acc.technical += feedback.technical_score || 0;
        acc.communication += feedback.communication_score || 0;
        acc.overall += feedback.overall_score || 0;
        acc.count++;
      }
      return acc;
    },
    { technical: 0, communication: 0, overall: 0, count: 0 }
  );

  const avgTechnical = averageScores.count > 0 ? (averageScores.technical / averageScores.count).toFixed(1) : 0;
  const avgCommunication = averageScores.count > 0 ? (averageScores.communication / averageScores.count).toFixed(1) : 0;
  const avgOverall = averageScores.count > 0 ? (averageScores.overall / averageScores.count).toFixed(1) : 0;

  // Extract all strengths and improvements
  const allStrengths = feedbackData.flatMap(f => f?.strengths || []);
  const allImprovements = feedbackData.flatMap(f => f?.improvements || []);

  // Count frequency of each feedback point
  const countFrequency = (items) => {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  };

  const strengthsFrequency = countFrequency(allStrengths);
  const improvementsFrequency = countFrequency(allImprovements);

  // Get top 3 most frequent items
  const getTopItems = (frequencyMap) => {
    return Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item]) => item);
  };

  const topStrengths = getTopItems(strengthsFrequency);
  const topImprovements = getTopItems(improvementsFrequency);

  return (
    <div className="interview-complete-container">
      <div className="header-section">
        <h1>Interview Complete!</h1>
        <p className="subtitle">You've finished your {interviewData?.jobRole || 'mock'} interview</p>
      </div>

      <div className="performance-summary">
        <h2>Performance Summary</h2>
        
        <div className="score-cards">
          <div className="score-card">
            <div className="score-value">{avgOverall}</div>
            <div className="score-label">Overall Score</div>
            <div className="score-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${avgOverall}%` }}
              ></div>
            </div>
          </div>
          
          <div className="score-card">
            <div className="score-value">{avgTechnical}/5</div>
            <div className="score-label">Technical Skills</div>
            <div className="score-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${(avgTechnical / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="score-card">
            <div className="score-value">{avgCommunication}/5</div>
            <div className="score-label">Communication</div>
            <div className="score-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${(avgCommunication / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="feedback-section">
        <div className="strengths-card">
          <h3>Your Key Strengths</h3>
          <ul>
            {topStrengths.length > 0 ? (
              topStrengths.map((strength, index) => (
                <li key={index}>
                  <span className="strength-icon">✓</span>
                  {strength}
                </li>
              ))
            ) : (
              <li>No specific strengths identified</li>
            )}
          </ul>
        </div>

        <div className="improvements-card">
          <h3>Areas for Improvement</h3>
          <ul>
            {topImprovements.length > 0 ? (
              topImprovements.map((improvement, index) => (
                <li key={index}>
                  <span className="improvement-icon">!</span>
                  {improvement}
                </li>
              ))
            ) : (
              <li>No specific improvements identified</li>
            )}
          </ul>
        </div>
      </div>

      {interviewData?.questions && (
        <div className="question-review">
          <h2>Question Review</h2>
          <div className="questions-list">
            {interviewData.questions.map((question, index) => (
              <div key={index} className="question-item">
                <h4>Question {index + 1}: {question.question}</h4>
                {feedbackData[index] && (
                  <>
                    <p className="feedback-text">
                      <strong>Feedback:</strong> {feedbackData[index].concise_feedback}
                    </p>
                    <p className="suggested-answer">
                      <strong>Suggested Answer:</strong> {feedbackData[index].suggested_answer}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="action-buttons">
        <button 
          className="btn-download"
          onClick={() => alert('Feature coming soon!')}
        >
          Download Full Report
        </button>
        <button 
          className="btn-restart"
          onClick={() => navigate('/interview-question')}
        >
          Start New Interview
        </button>
        <button 
          className="btn-home"
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default InterviewComplete;