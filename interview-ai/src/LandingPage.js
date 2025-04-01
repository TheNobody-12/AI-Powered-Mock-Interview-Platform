import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth(); // Get authentication status

    useEffect(() => {
        // Redirect authenticated users to dashboard
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="landing-container">
            {/* Hero Section */}
            <header className="hero-section">
                <div className="hero-content">
                    <h1>Master Your Interview Skills with AI</h1>
                    <p className="hero-subtitle">
                        Practice with our intelligent interview coach and receive instant, personalized feedback 
                        to boost your confidence and performance.
                    </p>
                    <div className="cta-container">
                        <button
                            className="cta-button primary"
                            onClick={() => navigate(isAuthenticated ? '/interview' : '/auth')}
                        >
                            {isAuthenticated ? 'Start Interview' : 'Get Started Free'}
                        </button>
                        {!isAuthenticated && (
                            <button
                                className="cta-button secondary"
                                onClick={() => navigate('/auth')}
                            >
                                Already a member? Sign In
                            </button>
                        )}
                    </div>
                </div>
                <div className="hero-image">
                    <div className="mock-interview"></div>
                </div>
            </header>

            {/* Features Section */}
            <section className="features-section">
                <h2 className="section-title">Why Choose Our Platform</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🎤</div>
                        <h3>Realistic Interviews</h3>
                        <p>Our AI mimics real interviewers with natural conversations and follow-up questions.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Comprehensive Feedback</h3>
                        <p>Detailed analysis on your answers, speech patterns, and even non-verbal cues.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Personalized Training</h3>
                        <p>Customized practice based on your target industry and experience level.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <div className="steps-container">
                    <h2 className="section-title">How It Works</h2>
                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <h3>Select Your Interview</h3>
                            <p>Choose from various job roles and difficulty levels.</p>
                        </div>
                        <div className="step">
                            <div className="step-number">2</div>
                            <h3>Practice with AI</h3>
                            <p>Respond naturally via webcam and microphone.</p>
                        </div>
                        <div className="step">
                            <div className="step-number">3</div>
                            <h3>Improve with Feedback</h3>
                            <p>Receive instant analysis and actionable insights.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials">
                <h2 className="section-title">Success Stories</h2>
                <div className="testimonial-cards">
                    <div className="testimonial">
                        <p>"This platform helped me land my dream job at Google!"</p>
                        <div className="user">- Sarah, Software Engineer</div>
                    </div>
                    <div className="testimonial">
                        <p>"The feedback was so detailed, I improved after just 3 sessions."</p>
                        <div className="user">- Michael, Product Manager</div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta">
                <h2>Ready to Ace Your Next Interview?</h2>
                <button
                    className="cta-button primary large"
                    onClick={() => navigate(isAuthenticated ? '/interview' : '/auth')}
                >
                    {isAuthenticated ? 'Start Practicing Now' : 'Join Free Today'}
                </button>
            </section>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-logo">AI Interview Coach</div>
                    <div className="footer-links">
                        <a href="/about">About</a>
                        <a href="/privacy">Privacy</a>
                        <a href="/terms">Terms</a>
                        <a href="/contact">Contact</a>
                    </div>
                    <p className="copyright">© {new Date().getFullYear()} AI Interview Coach. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;