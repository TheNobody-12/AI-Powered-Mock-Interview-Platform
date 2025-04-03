import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from './AuthContext';
import './AuthForms.css';

const API_URL = "http://127.0.0.1:5000";

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Required'),
  password: Yup.string()
    .required('Required')
});

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user_id, data.name);
      navigate('/interview-question'); // Redirect to interview question page
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <Field 
                name="email" 
                type="email" 
                className="form-control"
                placeholder="Enter your email"
              />
              <ErrorMessage name="email" component="div" className="error-message" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <Field 
                name="password" 
                type="password" 
                className="form-control"
                placeholder="Enter your password"
              />
              <ErrorMessage name="password" component="div" className="error-message" />
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <ErrorMessage name="general" component="div" className="error-message general-error" />
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default LoginForm;