import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import RecordRTC from "recordrtc";
import Webcam from "react-webcam";
import Feedback from "./Feedback";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000";

function LiveInterview({ interviewData }) {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState("");
  const [positivityScore, setPositivityScore] = useState(0.5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const webcamRef = useRef(null);
  const socket = useRef(null);
  const videoIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socket.current = io(API_URL);
    socket.current.on("update", (data) => {
      if (data.transcript) {
        setTranscript((prev) => prev + "\n" + data.transcript);
      }
      if (data.positivity_score !== undefined) {
        setPositivityScore(data.positivity_score);
      }
    });

    return () => {
      socket.current.disconnect();
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setRecording(true);
    try {
      // Request audio & video stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      // Start audio recording with RecordRTC
      mediaRecorder.current = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 2000,
        ondataavailable: async (blob) => {
          const formData = new FormData();
          formData.append("audio", blob, "audio.wav");
          await axios.post(`${API_URL}/send_audio`, formData);
        },
      });
      mediaRecorder.current.startRecording();
      
      // Start periodic video capture every 3 seconds
      videoIntervalRef.current = setInterval(async () => {
        if (webcamRef.current) {
          const screenshot = webcamRef.current.getScreenshot();
          if (screenshot) {
            const res = await fetch(screenshot);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append("video", blob, "video.jpeg");
            await axios.post(`${API_URL}/send_video`, formData);
          }
        }
      }, 3000);
      
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    if (mediaRecorder.current) {
      mediaRecorder.current.stopRecording(async () => {
        console.log("Recording stopped.");
        if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
        await getFeedback();
      });
    }
  };

  const getFeedback = async () => {
    try {
      const response = await axios.post(`${API_URL}/get_feedback`, {
        transcript,
        question: interviewData.questions[currentQuestionIndex].question,
      });
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setTranscript("");
    setFeedback(null);
    setPositivityScore(0.5);
  };

  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="container mt-5">
      <div className="card p-4">
        <h2 className="card-title mb-3">Answer the Question</h2>
        <div className="mb-3">
          <p className="lead">{interviewData.questions[currentQuestionIndex].question}</p>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="img-fluid rounded" />
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <button
                onClick={startRecording}
                disabled={recording}
                className="btn btn-success me-2"
              >
                Start Recording
              </button>
              <button
                onClick={stopRecording}
                disabled={!recording}
                className="btn btn-danger"
              >
                Stop Recording
              </button>
            </div>
            <div className="mb-3">
              <h3>Live Transcription:</h3>
              <textarea
                value={transcript}
                readOnly
                rows="6"
                className="form-control"
              ></textarea>
            </div>
            <div className="mb-3">
              <h3>Positivity Score:</h3>
              <p className="fs-4 fw-bold">{positivityScore}</p>
            </div>
          </div>
        </div>
        {feedback && (
          <div className="alert alert-info mt-3">
            <Feedback feedback={feedback} />
          </div>
        )}
        <div className="d-flex justify-content-between mt-4">
          <button
            onClick={handleNextQuestion}
            className="btn btn-primary"
          >
            Next Question
          </button>
          <button
            onClick={handleExit}
            className="btn btn-secondary"
          >
            Exit Interview
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiveInterview;
