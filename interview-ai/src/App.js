import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import Navbar from "./Navbar";
import InterviewForm from "./InterviewForm";
import LiveInterview from "./LiveInterview";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import InterviewComplete from "./InterviewComplete";
import Auth from "./Auth";

function App() {
  const [interviewData, setInterviewData] = useState(null);

  return (
    <Router>
      <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/interview-question" element={<InterviewForm setInterviewData={setInterviewData} />} />
        <Route path="/interview" element={<LiveInterview interviewData={interviewData} />} />
        <Route path="/interview-complete" element={<InterviewComplete />} />
        <Route path="/exit" element={
          <div className="container mt-5">
            <div className="alert alert-info text-center">
              <h2>Thank you for participating!</h2>
            </div>
          </div>
        } />
      </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
