import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validate = () => {
        const newErrors = {};
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        // Simulate successful login
        console.log('Login submitted:', { email, password });
        
        // Redirect to interview page
        navigate('/interview-question');
        
        // If you're using the onLoginSuccess prop from AuthContext
        if (onLoginSuccess) {
            onLoginSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'error' : ''}
                    required
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            <div className="form-group">
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'error' : ''}
                    required
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
            <button type="submit" className="auth-submit-btn">Login</button>
        </form>
    );
};

export default LoginForm;