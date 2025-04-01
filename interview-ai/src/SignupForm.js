import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from './AuthContext';
import './AuthForms.css';

const API_URL = "http://127.0.0.1:5000";


const SignupSchema = Yup.object().shape({
  name: Yup.string()
    .required('Required')
    .min(2, 'Too short!')
    .max(50, 'Too long!'),
  email: Yup.string()
    .email('Invalid email')
    .required('Required'),
  password: Yup.string()
    .required('Required')
    .min(8, 'Too short!'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Required')
});

const SignupForm = () => {
  const { login } = useAuth();

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically log in after registration
      const loginResponse = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const loginData = await loginResponse.json();
      if (!loginResponse.ok) throw new Error(loginData.error || 'Auto-login failed');
      
      login(loginData.token, loginData.user_id, loginData.name);
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create New Account</h2>
      <Formik
        initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
        validationSchema={SignupSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <Field 
                name="name" 
                type="text" 
                className="form-control"
                placeholder="Enter your full name"
              />
              <ErrorMessage name="name" component="div" className="error-message" />
            </div>

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
                placeholder="Create a password (min 8 characters)"
              />
              <ErrorMessage name="password" component="div" className="error-message" />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <Field 
                name="confirmPassword" 
                type="password" 
                className="form-control"
                placeholder="Confirm your password"
              />
              <ErrorMessage name="confirmPassword" component="div" className="error-message" />
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Sign Up'}
            </button>

            <ErrorMessage name="general" component="div" className="error-message general-error" />
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SignupForm;