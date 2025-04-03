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
  const [error, setError] = useState({
    message: null,
    type: null,
    timestamp: null
  });
  const [loading, setLoading] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [engagementTips, setEngagementTips] = useState([]);

  const mediaRecorder = useRef(null);
  const webcamRef = useRef(null);
  const socket = useRef(null);
  const videoIntervalRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);

  // Engagement tips based on score
  const tips = {
    low: [
      "Try to maintain eye contact with the camera",
      "Speak with more energy and enthusiasm",
      "Use hand gestures to emphasize points",
      "Smile more to appear more approachable"
    ],
    medium: [
      "Vary your tone of voice to keep it interesting",
      "Structure your answers with clear points",
      "Include relevant examples from your experience",
      "Maintain good posture throughout"
    ],
    high: [
      "Great job! Keep this energy",
      "Consider adding more technical details",
      "Relate answers back to company values",
      "Ask thoughtful questions when appropriate"
    ]
  };

  // Initialize component
  useEffect(() => {
    console.log("Received interview data:", interviewData);
    if (interviewData?.questions) {
      setLoading(false);
    }
  }, [interviewData]);

  // Update engagement tips when score changes
  useEffect(() => {
    if (engagementScore < 40) {
      setEngagementTips(tips.low);
    } else if (engagementScore < 70) {
      setEngagementTips(tips.medium);
    } else {
      setEngagementTips(tips.high);
    }
  }, [engagementScore]);


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
        setError({ message: null, type: null, timestamp: null });
      });

      socket.current.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });

      socket.current.on("connect_error", (err) => {
        setConnectionStatus("error");
        setError({
          message: "Failed to connect to analysis server",
          type: "socket",
          timestamp: Date.now()
        });
        console.error("Socket connection error:", err);
      });

      socket.current.on("update", (data) => {
        if (data.transcript) {
          // Clean up the transcript before setting state
          const cleanTranscript = data.transcript
            .replace(/\n/g, ' ')
            .replace(/([.!?])\s*/g, '$1 ')
            .replace(/\s+/g, ' ')
            .trim();

          setTranscript(prev => {
            const updated = prev ? `${prev} ${cleanTranscript}` : cleanTranscript;
            return updated.replace(/\s+/g, ' '); // Ensure single spaces
          });
        }

        if (data.engagement_score !== undefined || data.emotion) {
          const positivityScore = calculatePositivityScore(
            data.emotion || 'neutral',
            data.engagement_score || 0
          );

          setPositivityScore(Math.round(positivityScore * 100));
          setLastUpdate(Date.now());

          if (data.engagement_score !== undefined) {
            setEngagementScore(Math.round(data.engagement_score * 100));
          }
        }
      });

      const calculatePositivityScore = (emotion, engagementScore) => {
        const emotionWeights = {
          happy: 1.0,
          surprise: 0.8,
          neutral: 0.8,
          sad: 0.3,
          angry: 0.1,
          fear: 0.2,
          disgust: 0.1
        };

        const emotionScore = emotionWeights[emotion.toLowerCase()] || 0.5;
        const combinedScore = (0.6 * emotionScore) + (0.4 * engagementScore);
        return Math.min(1, Math.max(0, combinedScore));
      };

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
    setError({ message: null, type: null, timestamp: null });
    setRecording(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.close();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: true
      });

      mediaRecorder.current = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 5000,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        ondataavailable: async (blob) => {
          try {
            const audioBuffer = await blob.arrayBuffer();
            const formData = new FormData();
            formData.append("audio", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
            await axios.post(`${API_URL}/send_audio`, formData);
          } catch (err) {
            console.error("Error sending audio:", err);
            setError({
              message: "Failed to send audio for analysis",
              type: "media",
              timestamp: Date.now()
            });
          }
        },
      });

      mediaRecorder.current.startRecording();

      videoIntervalRef.current = setInterval(async () => {
        if (webcamRef.current) {
          try {
            setVideoProcessing(true);
            const screenshot = webcamRef.current.getScreenshot();
            if (screenshot) {
              const res = await fetch(screenshot);
              const blob = await res.blob();
              const formData = new FormData();
              formData.append("video", blob, "frame.jpeg");

              const response = await axios.post(`${API_URL}/send_video`, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                },
                timeout: 5000
              });

              if (response.data.status === "error") {
                console.error("Video processing error:", response.data.error);
              }
            }
          } catch (err) {
            console.error("Error sending video:", err);
            if (!err.response) {
              setError({
                message: "Video analysis service unavailable",
                type: "analysis",
                timestamp: Date.now()
              });
            }
          } finally {
            setVideoProcessing(false);
          }
        }
      }, 1000); //
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError({
        message: "Could not access camera/microphone. Please check permissions.",
        type: "media",
        timestamp: Date.now()
      });
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
      setError({ message: null, type: null, timestamp: null });

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
      setError({
        message: error.response?.data?.error || error.message,
        type: "analysis",
        timestamp: Date.now()
      });
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
          <div className="loading-content">
            <h2>Preparing your interview questions...</h2>
            <div className="spinner"></div>
            <p className="loading-tip">Tip: Take deep breaths and relax before starting</p>
          </div>
        </div>
      ) : (
        <div className="interview-layout">
          <div className={`questions-sidebar ${sidebarOpen ? '' : 'closed'}`}>
            <div className="sidebar-header">
              <h3>Interview Questions</h3>
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
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

          <div className={`interview-content ${sidebarOpen ? '' : 'full-width'}`}>
            {!sidebarOpen && (
              <button
                className="sidebar-toggle closed"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                ☰ Show Questions
              </button>
            )}

            <div className="connection-status" data-status={connectionStatus}>
              <span className="status-indicator"></span>
              {connectionStatus === "connected" ? "Live Analysis Active" :
                connectionStatus === "error" ? "Analysis Disconnected" : "Connecting..."}
            </div>

            <div className="interview-card">
              <div className="interview-header">
                <h2>Mock Interview Session</h2>
                <div className="header-meta">
                  <div className="progress-indicator">
                    Question {currentQuestionIndex + 1} of {interviewData?.questions?.length || 0}
                  </div>
                  <div className="question-role">
                    Role: {interviewData?.jobRole || "N/A"}
                  </div>
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
                    className={`webcam-feed ${videoProcessing ? 'processing' : ''}`}
                    mirrored={true}
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'user'
                    }}
                    aria-label="Webcam feed"
                  />
                  <div className="recording-indicator" data-recording={recording}>
                    <span className="indicator-dot"></span>
                    {recording ? "RECORDING" : "PAUSED"}
                  </div>
                </div>

                <div className="controls-panel">
                  <div className="control-buttons">
                    <button
                      onClick={startRecording}
                      disabled={recording || connectionStatus !== "connected"}
                      className="btn-record-start"
                      aria-label="Start recording"
                    >
                      <i className="icon-mic"></i> Start Answer
                    </button>
                    <button
                      onClick={stopRecording}
                      disabled={!recording}
                      className="btn-record-stop"
                      aria-label="Stop recording"
                    >
                      <i className="icon-stop"></i> Stop Answer
                    </button>
                    <button
                      onClick={handleSkipQuestion}
                      className="btn-skip"
                      disabled={recording}
                      aria-label="Skip question"
                    >
                      Skip Question
                    </button>
                  </div>

                  <div className="metrics-display">
                    <div className="metric">
                      <div className="metric-header">
                        <span className="metric-label">Positivity</span>
                        <span className="metric-value">{positivityScore}%</span>
                      </div>
                      <div className="score-bar-container">
                        <div
                          className="score-fill positivity-fill"
                          style={{ width: `${positivityScore}%` }}
                        ></div>
                      </div>
                      <div className="emotion-indicator">
                        {positivityScore > 70 ? "😊" :
                          positivityScore > 40 ? "😐" : "😞"}
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-header">
                        <span className="metric-label">Engagement</span>
                        <span className="metric-value">{engagementScore}%</span>
                      </div>
                      <div className="score-bar-container">
                        <div
                          className="score-fill engagement-fill"
                          style={{ width: `${engagementScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Analysis</span>
                      <div className="update-indicator" data-active={lastUpdate > Date.now() - 4000}>
                        <span className="indicator-dot"></span>
                        {lastUpdate > Date.now() - 4000 ? "Live" : "Paused"}
                      </div>
                    </div>
                  </div>

                  <div className="engagement-tips">
                    <h4>Tips to Improve:</h4>
                    <ul>
                      {engagementTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="transcript-container">
                <div className="transcript-header">
                  <h3>Live Transcript:</h3>
                  <button
                    className="btn-clear-transcript"
                    onClick={() => setTranscript("")}
                    disabled={!transcript}
                  >
                    Clear
                  </button>
                </div>
                <div className="transcript-box">
                  {transcript ? (
                    <div className="transcript-flow">
                    {transcript
                      .replace(/\n/g, ' ')  // Remove newlines
                      .replace(/\s+/g, ' ')  // Collapse multiple spaces
                      .trim()                // Trim whitespace
                      .split(' ')
                      .map((word, index, array) => (
                        <span key={index} className="transcript-word">
                          {word}
                          {index < array.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                  </div>
                  ) : (
                    <div className="empty-transcript">
                      <p>Your response will appear here...</p>
                      <p className="hint">Start speaking when you click "Start Answer"</p>
                    </div>
                  )}
                </div>
              </div>

              {loadingFeedback ? (
                <div className="feedback-loading">
                  <div className="spinner"></div>
                  <p>Analyzing your response...</p>
                </div>
              ) : feedback ? (
                <Feedback feedback={feedback} />
              ) : error.message ? (
                <div className="feedback-error">
                  <p>{error.message}</p>
                  <button onClick={getFeedback}>Retry Analysis</button>
                </div>
              ) : null}

              <div className="navigation-buttons">
                <button
                  onClick={handleExit}
                  className="btn-exit"
                  aria-label="Exit interview"
                >
                  Exit Interview
                </button>
                <button
                  onClick={moveToNextQuestion}
                  disabled={recording}
                  className="btn-next"
                  aria-label="Next question"
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