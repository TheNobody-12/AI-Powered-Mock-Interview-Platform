import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleStartInterview = () => {
        navigate('/interview-question');
    };

    const handlePracticeQuestions = () => {
        navigate('/interview-question');
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Welcome, {user?.name || 'User'}!</h1>
                <p>Ready to improve your interview skills?</p>
            </div>

            <div className="action-cards">
                <div className="action-card primary" onClick={handleStartInterview}>
                    <h2>Start New Interview</h2>
                    <p>Full mock interview with AI feedback</p>
                    <button>Begin</button>
                </div>

                <div className="action-card" onClick={handlePracticeQuestions}>
                    <h2>Practice Questions</h2>
                    <p>Focus on specific question types</p>
                    <button>Practice</button>
                </div>

                <div className="action-card">
                    <h2>Resources</h2>
                    <p>Interview tips and learning materials</p>
                    <button>Explore</button>
                </div>
            </div>

            <div className="quick-stats">
                <div className="stat-item">
                    <h3>Today's Goal</h3>
                    <p>Complete 1 interview</p>
                </div>
                <div className="stat-item">
                    <h3>Weekly Progress</h3>
                    <p>0/3 sessions</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;