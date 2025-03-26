import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import RecordRTC from "recordrtc";
import Webcam from "react-webcam";
import Feedback from "./Feedback";
import { useNavigate } from "react-router-dom";
import "./LiveInterview.css";

const API_URL = "http://127.0.0.1:5000";

function LiveInterview({ interviewData }) {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState("");
  const [positivityScore, setPositivityScore] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [recording, setRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);

  const mediaRecorder = useRef(null);
  const webcamRef = useRef(null);
  const socket = useRef(null);
  const videoIntervalRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize component
  useEffect(() => {
    console.log("Received interview data:", interviewData);
    if (interviewData?.questions) {
      setLoading(false);
    }
  }, [interviewData]);

  const getCurrentQuestion = () => {
    try {
      if (!interviewData?.questions || interviewData.questions.length === 0) {
        return "Loading questions...";
      }
      const question = interviewData.questions[currentQuestionIndex];
      return question?.question || question?.text || "Could not display question";
    } catch (error) {
      console.error("Error getting question:", error);
      return "Error displaying question";
    }
  };

  // WebSocket connection
  useEffect(() => {
    const connectSocket = () => {
      socket.current = io(API_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.current.on("connect", () => {
        setConnectionStatus("connected");
        setError(null);
      });

      socket.current.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });

      socket.current.on("connect_error", (err) => {
        setConnectionStatus("error");
        setError("Failed to connect to analysis server");
        console.error("Socket connection error:", err);
      });

      socket.current.on("update", (data) => {
        if (data.transcript) {
          setTranscript(prev => prev + (prev ? "\n" : "") + data.transcript);
        }
        if (data.positivity_score !== undefined) {
          setPositivityScore(Math.round(data.positivity_score * 100));
        }
        if (data.engagement_score !== undefined) {
          setEngagementScore(Math.round(data.engagement_score * 100));
        }
      });

      return () => {
        socket.current.disconnect();
      };
    };

    connectSocket();

    return () => {
      if (socket.current) socket.current.disconnect();
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      if (mediaRecorder.current) {
        mediaRecorder.current.stopRecording();
      }
    };
  }, []);

  const cleanupMedia = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stopRecording();
      mediaRecorder.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (webcamRef.current) {
      const stream = webcamRef.current.video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  

  const startRecording = async () => {
    setError(null);
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      // # In your React component's startRecording function:
      mediaRecorder.current = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 3000,
        // # Increased from 2000 to 3000 ms(3 second chunks)
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        // # Larger buffer size
        ondataavailable: async (blob) => {
          try {
            const audioBuffer = await blob.arrayBuffer();
            const formData = new FormData();
            formData.append("audio", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
            await axios.post(`${API_URL}/send_audio`, formData);
          } catch (err) {
            console.error("Error sending audio:", err);
            setError("Failed to send audio for analysis");
          }
        },
      });
      mediaRecorder.current.startRecording();

      videoIntervalRef.current = setInterval(async () => {
        if (webcamRef.current) {
          try {
            const screenshot = webcamRef.current.getScreenshot();
            if (screenshot) {
              const res = await fetch(screenshot);
              const blob = await res.blob();
              const formData = new FormData();
              formData.append("video", blob, "video.jpeg");
              await axios.post(`${API_URL}/send_video`, formData);
            }
          } catch (err) {
            console.error("Error sending video:", err);
          }
        }
      }, 3000);

    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Could not access camera/microphone. Please check permissions.");
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    if (mediaRecorder.current) {
      mediaRecorder.current.stopRecording(() => {
        if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
        getFeedbackWithRetry();
      });
    }
  };

  const getFeedbackWithRetry = async () => {
    try {
      await getFeedback();
    } catch (error) {
      if (retryCount < 2) {
        setRetryCount(retryCount + 1);
        setTimeout(getFeedbackWithRetry, 2000);
      }
    }
  };

  const getFeedback = async () => {
    try {
      setLoadingFeedback(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/analyze_response`,
        {
          question: getCurrentQuestion(),
          response: transcript,
        },
        { timeout: 20000 }
      );

      if (response.data.status !== "success") {
        throw new Error(response.data.error || "Invalid feedback response");
      }

      const newFeedback = response.data.feedback;
      setFeedback(newFeedback);
      setAllFeedback(prev => [...prev, newFeedback]);
      setAnsweredQuestions(prev => [...prev, currentQuestionIndex]);
    } catch (error) {
      console.error("Feedback error:", error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleQuestionSelect = (index) => {
    if (index === currentQuestionIndex) return;

    if (recording) {
      if (window.confirm("You're currently recording. Do you want to stop recording and switch questions?")) {
        stopRecording().then(() => {
          changeQuestion(index);
        });
      }
    } else {
      changeQuestion(index);
    }
  };

  const changeQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setTranscript("");
    setFeedback(null);
    setPositivityScore(0);
    setEngagementScore(0);
  };

  const handleSkipQuestion = () => {
    if (recording) {
      if (window.confirm("You're currently recording. Do you want to stop recording and skip this question?")) {
        stopRecording().then(() => {
          moveToNextQuestion();
        });
      }
    } else {
      moveToNextQuestion();
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < interviewData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscript("");
      setFeedback(null);
      setPositivityScore(0);
      setEngagementScore(0);
    } else {
      completeInterview();
    }
  };

  const completeInterview = () => {
    cleanupMedia();
    navigate("/interview-complete", {
      state: {
        interviewData,
        feedbackData: allFeedback
      }
    });
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit the interview?")) {
      completeInterview();
    }
  };

  return (
    <div className="live-interview-container">
      {loading ? (
        <div className="loading-screen">
          <h2>Preparing your interview questions...</h2>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="interview-layout">
          {/* Sidebar */}
          {sidebarOpen && (
            <div className="questions-sidebar">
              <div className="sidebar-header">
                <h3>Interview Questions</h3>
                <button
                  className="sidebar-toggle"
                  onClick={() => setSidebarOpen(false)}
                >
                  &times;
                </button>
              </div>
              <ul className="questions-list">
                {interviewData.questions.map((question, index) => (
                  <li
                    key={index}
                    className={`question-item ${currentQuestionIndex === index ? 'active' : ''} ${answeredQuestions.includes(index) ? 'answered' : ''}`}
                    onClick={() => handleQuestionSelect(index)}
                  >
                    <span className="question-number">Q{index + 1}</span>
                    <span className="question-text">
                      {question.question || question.text}
                    </span>
                    {answeredQuestions.includes(index) && (
                      <span className="answered-icon">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Content */}
          <div className={`interview-content ${sidebarOpen ? '' : 'full-width'}`}>
            {!sidebarOpen && (
              <button
                className="sidebar-toggle closed"
                onClick={() => setSidebarOpen(true)}
              >
                ☰ Show Questions
              </button>
            )}

            <div className="connection-status" data-status={connectionStatus}>
              {connectionStatus === "connected" ? "Live Analysis Active" :
                connectionStatus === "error" ? "Analysis Disconnected" : "Connecting..."}
            </div>

            <div className="interview-card">
              <div className="interview-header">
                <h2>Mock Interview Session</h2>
                <div className="progress-indicator">
                  Question {currentQuestionIndex + 1} of {interviewData?.questions?.length || 0}
                </div>
                <div className="question-role">
                  Role: {interviewData?.jobRole || "N/A"}
                </div>
              </div>

              <div className="question-container">
                <div className="question-card">
                  <h3>Current Question:</h3>
                  <p className="question-text">
                    {getCurrentQuestion()}
                  </p>
                </div>
              </div>

              <div className="media-container">
                <div className="webcam-container">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="webcam-feed"
                    mirrored={true}
                  />
                  <div className="recording-indicator" data-recording={recording}>
                    {recording ? "RECORDING" : "PAUSED"}
                  </div>
                </div>

                <div className="controls-panel">
                  <div className="control-buttons">
                    <button
                      onClick={startRecording}
                      disabled={recording || connectionStatus !== "connected"}
                      className="btn-record-start"
                    >
                      <i className="icon-mic"></i> Start Answer
                    </button>
                    <button
                      onClick={stopRecording}
                      disabled={!recording}
                      className="btn-record-stop"
                    >
                      <i className="icon-stop"></i> Stop Answer
                    </button>
                    <button
                      onClick={handleSkipQuestion}
                      className="btn-skip"
                      disabled={recording}
                    >
                      Skip Question
                    </button>
                  </div>

                  <div className="metrics-display">
                    <div className="metric">
                      <span className="metric-label">Positivity</span>
                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{ width: `${positivityScore}%` }}
                        ></div>
                        <span className="score-value">{positivityScore}%</span>
                      </div>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Engagement</span>
                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{ width: `${engagementScore}%` }}
                        ></div>
                        <span className="score-value">{engagementScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* // In your React component */}
              <div className="transcript-container">
                <h3>Live Transcript:</h3>
                <div className="transcript-box">
                  {transcript ? (
                    <div className="transcript-flow">
                      {transcript.split(' ').map((word, index) => (
                        <span key={index} className="transcript-word">
                          {word}
                          {index < transcript.split(' ').length - 1 ? ' ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="empty-transcript">Your response will appear here...</span>
                  )}
                </div>
              </div>

              {loadingFeedback ? (
                <div className="loading-feedback">
                  <div className="spinner"></div>
                  <p>Analyzing your response...</p>
                </div>
              ) : feedback ? (
                <Feedback feedback={feedback} />
              ) : error ? (
                <div className="feedback-error">
                  <p>{error}</p>
                  <button onClick={getFeedback}>Retry Analysis</button>
                </div>
              ) : null}

              <div className="navigation-buttons">
                <button
                  onClick={handleExit}
                  className="btn-exit"
                >
                  Exit Interview
                </button>
                <button
                  onClick={moveToNextQuestion}
                  disabled={recording}
                  className="btn-next"
                >
                  {currentQuestionIndex < (interviewData?.questions?.length || 0) - 1
                    ? "Next Question"
                    : "Finish Interview"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveInterview;