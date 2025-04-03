import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/interview-question');
  }

  // Modify your handleSubmit functions in LoginForm and SignupForm to use these methods
  const handleLogin = (email, password) => {
    login({ email }); // In a real app, you would verify credentials first
  };

  const handleSignup = (name, email, password) => {
    signup({ name, email }); // In a real app, you would create the user first
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {isLogin ?
          <LoginForm onSubmit={handleLogin} onLoginSuccess={handleLoginSuccess} /> :
          <SignupForm onSubmit={handleSignup} />
        }

        <div className="auth-footer">
          {isLogin ? (
            <p>Don't have an account? <button onClick={() => setIsLogin(false)}>Sign up</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => setIsLogin(true)}>Login</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;