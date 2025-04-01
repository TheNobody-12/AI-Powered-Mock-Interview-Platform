import React, { useState, useEffect, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import "./Navbar.css";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark ${scrolled ? "navbar-scrolled" : ""} fixed-top`}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="logo-container">
            <i className="fas fa-robot logo-icon"></i>
            <span className="logo-text">AI Interview Coach</span>
          </div>
        </Link>
        
        <button 
          className={`navbar-toggler ${mobileMenuOpen ? "collapsed" : ""}`}
          type="button" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <div className={`animated-hamburger ${mobileMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        
        <div className={`collapse navbar-collapse ${mobileMenuOpen ? "show" : ""}`} id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === "/" ? "active" : ""}`} 
                to="/"
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className="fas fa-home nav-icon"></i>
                <span className="nav-text">Home</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === "/interview-question" ? "active" : ""}`} 
                to="/interview-question"
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className="fas fa-microphone-alt nav-icon"></i>
                <span className="nav-text">Practice Interview</span>
              </Link>
            </li>
            
            {isAuthenticated ? (
              <>
                {/* <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === "/feedback" ? "active" : ""}`} 
                    to="/feedback"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-chart-line nav-icon"></i>
                    <span className="nav-text">My Feedback</span>
                  </Link>
                </li> */}
                <li className="nav-item user-greeting">
                  <div className="nav-link user-profile">
                    <i className="fas fa-user-circle user-icon"></i>
                    <span className="user-name">Welcome, {user?.name}</span>
                  </div>
                </li>
                <li className="nav-item">
                  <button 
                    className="btn btn-outline-light ms-lg-2 mt-2 mt-lg-0 logout-btn"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === "/auth" ? "active" : ""}`} 
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-sign-in-alt nav-icon"></i>
                    <span className="nav-text">Login</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    className="btn btn-primary ms-lg-2 mt-2 mt-lg-0 signup-btn"
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-user-plus"></i> Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;