import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import RecordRTC from "recordrtc";

const socket = io("http://127.0.0.1:5000");

function RealTimeSpeechEmotion() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(0);
  let recorder;
  let videoStream;

  useEffect(() => {
    socket.on("transcription", (data) => {
      setTranscript(data.transcript);
    });

    socket.on("emotion_analysis", (data) => {
      setConfidenceScore(data.confidence_score);
    });

    return () => socket.disconnect();
  }, []);

  const startRecording = async () => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((stream) => {
      // Start Audio Recording
      recorder = RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 500,
        ondataavailable: (blob) => {
          socket.emit("audio_stream", blob);
        },
      });

      recorder.startRecording();
      setRecording(true);

      // Start Webcam Streaming
      videoStream = stream;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      setInterval(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          socket.emit("image_stream", blob);
        }, "image/jpeg");
      }, 1000); 
    });
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stopRecording();
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
  };

  return (
    <div>
      <h2>🎤 Real-Time Speech & Emotion Analysis</h2>
      <button onClick={startRecording} disabled={recording}>🎙 Start Recording</button>
      <button onClick={stopRecording} disabled={!recording}>🛑 Stop Recording</button>
      <p>📜 Transcription: {transcript}</p>
      <p>😊 Confidence Score: {confidenceScore.toFixed(2)}</p>
    </div>
  );
}

export default RealTimeSpeechEmotion;
