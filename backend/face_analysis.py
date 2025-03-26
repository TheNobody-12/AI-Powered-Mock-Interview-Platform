# face_analysis.py
import cv2
import numpy as np
from deepface import DeepFace
import mediapipe as mp
from scipy.spatial import distance

class FaceAnalyzer:
    def __init__(self):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5
        )
        
        # Emotion weights for engagement score calculation
        self.emotion_weights = {
            "happy": 1.0,
            "surprise": 0.8,
            "neutral": 0.5,
            "angry": 0.2,
            "sad": 0.1,
            "fear": 0.3,
            "disgust": 0.2
        }
        
        # Eye landmark indices (from MediaPipe Face Mesh)
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        
        # Head posture key points
        self.NOSE_TIP = 1
        self.CHIN = 199
        self.LEFT_EAR = 234
        self.RIGHT_EAR = 454
        
        self.prev_face_center = None
        self.blink_counter = 0
        self.start_time = time.time()
        self.last_update_time = time.time()
        self.engagement_history = []
        self.positivity_history = []

    def eye_aspect_ratio(self, landmarks, eye_points):
        """Calculate Eye Aspect Ratio for blink detection."""
        A = distance.euclidean(landmarks[eye_points[1]], landmarks[eye_points[5]])
        B = distance.euclidean(landmarks[eye_points[2]], landmarks[eye_points[4]])
        C = distance.euclidean(landmarks[eye_points[0]], landmarks[eye_points[3]])
        ear = (A + B) / (2.0 * C)
        return ear

    def calculate_head_tilt(self, landmarks):
        """Calculate head tilt and movement."""
        nose = landmarks[self.NOSE_TIP]
        chin = landmarks[self.CHIN]
        left_ear = landmarks[self.LEFT_EAR]
        right_ear = landmarks[self.RIGHT_EAR]

        # Calculate vertical tilt angle
        vertical_angle = abs(nose[1] - chin[1]) / abs(left_ear[0] - right_ear[0] + 1e-6)

        # If head is too tilted downward, decrease score
        if vertical_angle < 0.8:
            return -0.5  # User might be distracted (looking at phone)

        return 0.0  # Normal posture

    def calculate_engagement(self, emotion, blinks_per_sec, head_movement, head_tilt_score):
        """Calculate engagement score from multiple factors."""
        # Emotion-based score
        emotion_score = self.emotion_weights.get(emotion, 0)

        # Blink-based score (Normalize blinks between 0 to 1)
        blink_score = min(blinks_per_sec / 5, 1.0)  # 5 blinks per sec = full engagement

        # Head movement score (Normalize movement)
        movement_score = max(1.0 - min(head_movement / 50, 1.0), 0.1)  # Too much movement = distraction

        # Combine all factors (40% emotion, 30% blinks, 20% movement, 10% tilt)
        final_score = (0.4 * emotion_score) + (0.3 * blink_score) + (0.2 * movement_score) + (0.1 * head_tilt_score)
        
        return max(0.0, min(final_score, 1.0))  # Ensure score is between 0 and 1

    def calculate_positivity(self, emotion):
        """Calculate positivity score based on emotion."""
        positive_emotions = ["happy", "surprise"]
        neutral_emotions = ["neutral"]
        negative_emotions = ["angry", "sad", "fear", "disgust"]
        
        if emotion in positive_emotions:
            return 0.8 + (np.random.random() * 0.2)  # 0.8-1.0
        elif emotion in neutral_emotions:
            return 0.4 + (np.random.random() * 0.4)  # 0.4-0.8
        else:
            return np.random.random() * 0.4  # 0-0.4

    def analyze_frame(self, frame):
        """Analyze a single frame for engagement and positivity."""
        try:
            # Convert frame to RGB (MediaPipe requires RGB input)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)

            # Perform emotion detection
            result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
            dominant_emotion = result[0]['dominant_emotion']
            positivity_score = self.calculate_positivity(dominant_emotion)

            head_movement = 0
            blinks_per_sec = 0
            head_tilt_score = 0

            # Process face landmarks if detected
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    # Convert landmarks to NumPy array for processing
                    landmarks = {i: (lm.x * frame.shape[1], lm.y * frame.shape[0]) 
                               for i, lm in enumerate(face_landmarks.landmark)}

                    # Calculate EAR for both eyes
                    leftEAR = self.eye_aspect_ratio(landmarks, self.LEFT_EYE)
                    rightEAR = self.eye_aspect_ratio(landmarks, self.RIGHT_EYE)
                    ear = (leftEAR + rightEAR) / 2.0

                    # Blink detection (EAR threshold ~ 0.25)
                    if ear < 0.25:
                        self.blink_counter += 1

                    # Calculate face center for head movement tracking
                    face_center = np.mean([landmarks[i] for i in range(468)], axis=0)

                    # Head movement detection
                    if self.prev_face_center is not None:
                        head_movement = np.linalg.norm(np.array(face_center) - np.array(self.prev_face_center))

                    self.prev_face_center = face_center  # Update previous face position

                    # Head tilt detection
                    head_tilt_score = self.calculate_head_tilt(landmarks)

            # Calculate blink rate per second
            elapsed_time = time.time() - self.start_time
            blinks_per_sec = self.blink_counter / elapsed_time if elapsed_time > 0 else 0

            # Reset blink counter every 10 seconds
            if elapsed_time > 10:
                self.blink_counter = 0
                self.start_time = time.time()

            # Final engagement score
            engagement_score = self.calculate_engagement(
                dominant_emotion, 
                blinks_per_sec, 
                head_movement, 
                head_tilt_score
            )

            # Update history (keep last 10 scores)
            current_time = time.time()
            if current_time - self.last_update_time > 1:  # Update once per second
                self.engagement_history.append(engagement_score)
                self.positivity_history.append(positivity_score)
                if len(self.engagement_history) > 10:
                    self.engagement_history.pop(0)
                    self.positivity_history.pop(0)
                self.last_update_time = current_time

            return {
                "engagement": engagement_score,
                "positivity": positivity_score,
                "emotion": dominant_emotion,
                "blink_rate": blinks_per_sec,
                "head_movement": head_movement
            }

        except Exception as e:
            print(f"Face analysis error: {str(e)}")
            return {
                "engagement": 0.5,
                "positivity": 0.5,
                "emotion": "neutral",
                "blink_rate": 0,
                "head_movement": 0
            }

    def get_smoothed_scores(self):
        """Return smoothed scores from history."""
        if not self.engagement_history:
            return 0.5, 0.5
        return (
            sum(self.engagement_history) / len(self.engagement_history),
            sum(self.positivity_history) / len(self.positivity_history)
        )