import React from 'react';
import './LandingPage.css'; // Create this CSS file
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    return (
        <div className="landing-container">
            <header className="hero-section">
                <h1>AI-Powered Interview Platform</h1>
                <p>Practice interviews with our AI and get instant feedback to improve your skills</p>
                <button
                    className="cta-button"
                    onClick={() => navigate('/auth')}
                >
                    Get Started
                </button>
            </header>

            <section className="features-section">
                <div className="feature">
                    <h3>Realistic Interviews</h3>
                    <p>Our AI mimics real interviewers with natural conversations</p>
                </div>
                <div className="feature">
                    <h3>Instant Feedback</h3>
                    <p>Get detailed analysis on your answers, tone, and body language</p>
                </div>
                <div className="feature">
                    <h3>Customizable</h3>
                    <p>Choose from different industries and difficulty levels</p>
                </div>
            </section>

            <section className="how-it-works">
                <h2>How It Works</h2>
                <ol>
                    <li>Select your interview type</li>
                    <li>Answer questions via webcam/microphone</li>
                    <li>Receive detailed feedback instantly</li>
                </ol>
            </section>

            <footer className="footer">
                <p>© 2023 AI Interview Coach. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;