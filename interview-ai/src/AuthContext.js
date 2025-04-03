import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    
    if (token && userId) {
      checkAuth(token).then(valid => {
        if (valid) {
          setIsAuthenticated(true);
          setUser({ id: userId, name: userName });
        }
      });
    }
  }, []);

  const checkAuth = async (token) => {
    try {
      const response = await fetch('/api/check-auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const login = (token, userId, userName) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_name', userName);
    setIsAuthenticated(true);
    setUser({ id: userId, name: userName });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create and export the useAuth hook
export const useAuth = () => {
  return useContext(AuthContext);
};