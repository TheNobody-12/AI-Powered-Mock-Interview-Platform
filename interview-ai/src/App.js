import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Navbar";
import InterviewForm from "./InterviewForm";
import LiveInterview from "./LiveInterview";

function App() {
  const [interviewData, setInterviewData] = useState(null);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<InterviewForm setInterviewData={setInterviewData} />} />
        <Route path="/interview" element={<LiveInterview interviewData={interviewData} />} />
        <Route path="/exit" element={
          <div className="container mt-5">
            <div className="alert alert-info text-center">
              <h2>Thank you for participating!</h2>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
