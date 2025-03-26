import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const login = (userData) => {
    setCurrentUser(userData);
    navigate('/'); // Redirect to home after login
  };

  const signup = (userData) => {
    setCurrentUser(userData);
    navigate('/'); // Redirect to home after signup
  };

  const logout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const value = {
    currentUser,
    login,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}