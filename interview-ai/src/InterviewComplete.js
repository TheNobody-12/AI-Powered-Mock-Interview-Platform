import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import './InterviewComplete.css';

// Register fonts
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf' },
    { src: 'https://fonts.gstatic.com/s/opensans/v17/mem5YaGs126MiZpBA-UNirkOUuhs.ttf', fontWeight: 600 }
  ]
});

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Open Sans' },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#7f8c8d' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50', textAlign: 'center' },
  scoreCards: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  scoreCard: { width: '30%', padding: 15, borderRadius: 8, backgroundColor: '#ffffff', textAlign: 'center' },
  scoreValue: { fontSize: 24, fontWeight: 'bold', color: '#3498db', marginBottom: 5 },
  scoreLabel: { fontSize: 12, color: '#7f8c8d', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#ecf0f1', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3498db' },
  feedbackCards: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  feedbackCard: { width: '48%', padding: 15, borderRadius: 8, backgroundColor: '#ffffff' },
  feedbackTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50', textAlign: 'center' },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, borderRadius: 4 },
  strengthItem: { backgroundColor: 'rgba(46, 204, 113, 0.1)' },
  improvementItem: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  icon: { width: 20, height: 20, borderRadius: 10, marginRight: 8, textAlign: 'center' },
  strengthIcon: { backgroundColor: '#2ecc71', color: 'white' },
  improvementIcon: { backgroundColor: '#e74c3c', color: 'white' },
  questionItem: { marginBottom: 15, padding: 15, border: '1px solid #ddd', borderRadius: 8 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  questionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3498db', color: 'white', textAlign: 'center', marginRight: 10, fontWeight: 'bold' },
  questionText: { fontSize: 12, fontWeight: 'bold', flex: 1 },
  feedbackContent: { marginTop: 10, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 4 },
  pageNumber: { position: 'absolute', bottom: 20, right: 30, fontSize: 10, color: '#7f8c8d' }
});

// PDF Document Component
const InterviewReport = ({ interviewData, feedbackData, avgTechnical, avgCommunication, avgOverall, topStrengths, topImprovements }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Interview Complete!</Text>
        <Text style={styles.subtitle}>
          You've finished your {interviewData?.jobRole || 'mock'} interview
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.scoreCards}>
          {/* Overall Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{avgOverall}</Text>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${avgOverall}%` }]} />
            </View>
          </View>

          {/* Technical Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{avgTechnical}/5</Text>
            <Text style={styles.scoreLabel}>Technical Skills</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(avgTechnical / 5) * 100}%` }]} />
            </View>
          </View>

          {/* Communication Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{avgCommunication}/5</Text>
            <Text style={styles.scoreLabel}>Communication</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(avgCommunication / 5) * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.feedbackCards}>
          {/* Strengths */}
          <View style={[styles.feedbackCard, { borderTop: '4px solid #2ecc71' }]}>
            <Text style={styles.feedbackTitle}>Your Key Strengths</Text>
            {topStrengths.length > 0 ? (
              topStrengths.map((strength, index) => (
                <View key={index} style={[styles.listItem, styles.strengthItem]}>
                  <View style={[styles.icon, styles.strengthIcon]}>
                    <Text>✓</Text>
                  </View>
                  <Text>{strength}</Text>
                </View>
              ))
            ) : (
              <Text>No specific strengths identified</Text>
            )}
          </View>

          {/* Improvements */}
          <View style={[styles.feedbackCard, { borderTop: '4px solid #e74c3c' }]}>
            <Text style={styles.feedbackTitle}>Areas for Improvement</Text>
            {topImprovements.length > 0 ? (
              topImprovements.map((improvement, index) => (
                <View key={index} style={[styles.listItem, styles.improvementItem]}>
                  <View style={[styles.icon, styles.improvementIcon]}>
                    <Text>!</Text>
                  </View>
                  <Text>{improvement}</Text>
                </View>
              ))
            ) : (
              <Text>No specific improvements identified</Text>
            )}
          </View>
        </View>
      </View>

      {interviewData?.questions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question Review</Text>
          {interviewData.questions.map((question, index) => (
            <View key={index} style={styles.questionItem} wrap={false}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                  <Text>Q{index + 1}</Text>
                </View>
                <Text style={styles.questionText}>{question.question}</Text>
              </View>

              {feedbackData[index] && (
                <>
                  <View style={styles.feedbackContent}>
                    <Text style={{ fontWeight: 'bold' }}>Feedback:</Text>
                    <Text>{feedbackData[index].concise_feedback}</Text>
                  </View>
                  <View style={styles.feedbackContent}>
                    <Text style={{ fontWeight: 'bold' }}>Suggested Answer:</Text>
                    <Text>{feedbackData[index].suggested_answer}</Text>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
        `${pageNumber} / ${totalPages}`
      )} fixed />
     </Page>
  </Document>
);

const InterviewComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewData = {}, feedbackData = [] } = location.state || {};

  const [expandedItems, setExpandedItems] = useState({});

  // Calculate average scores
  const averageScores = feedbackData.reduce(
    (acc, feedback) => {
      if (feedback) {
        acc.technical += feedback.technical_score || 0;
        acc.communication += feedback.communication_score || 0;
        acc.overall += feedback.overall_score || 0;
        acc.count++;
      }
      return acc;
    },
    { technical: 0, communication: 0, overall: 0, count: 0 }
  );

  const avgTechnical = averageScores.count > 0 ? (averageScores.technical / averageScores.count).toFixed(1) : 0;
  const avgCommunication = averageScores.count > 0 ? (averageScores.communication / averageScores.count).toFixed(1) : 0;
  const avgOverall = averageScores.count > 0 ? (averageScores.overall / averageScores.count).toFixed(1) : 0;

  // Feedback processing
  const countFrequency = (items) => items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  const getTopItems = (frequencyMap) => Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([item]) => item);

  const allStrengths = feedbackData.flatMap(f => f?.strengths || []);
  const allImprovements = feedbackData.flatMap(f => f?.improvements || []);
  const topStrengths = getTopItems(countFrequency(allStrengths));
  const topImprovements = getTopItems(countFrequency(allImprovements));

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="interview-complete-container">
      <div className="header-section">
        <h1>Interview Complete!</h1>
        <p className="subtitle">You've finished your {interviewData?.jobRole || 'mock'} interview</p>
      </div>

      {/* Performance Summary */}
      <div className="performance-summary">
        <h2>Performance Summary</h2>
        <div className="score-cards">
          <div className="score-card">
            <div className="score-value">{avgOverall}</div>
            <div className="score-label">Overall Score</div>
            <div className="score-progress">
              <div className="progress-bar" style={{ width: `${avgOverall}%` }}></div>
            </div>
          </div>
          <div className="score-card">
            <div className="score-value">{avgTechnical}/5</div>
            <div className="score-label">Technical Skills</div>
            <div className="score-progress">
              <div className="progress-bar" style={{ width: `${(avgTechnical / 5) * 100}%` }}></div>
            </div>
          </div>
          <div className="score-card">
            <div className="score-value">{avgCommunication}/5</div>
            <div className="score-label">Communication</div>
            <div className="score-progress">
              <div className="progress-bar" style={{ width: `${(avgCommunication / 5) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Summary */}
      <div className="feedback-section">
        <div className="strengths-card">
          <h3>Your Key Strengths</h3>
          <ul>
            {topStrengths.length > 0 ? (
              topStrengths.map((strength, index) => (
                <li key={index}>
                  <span className="strength-icon">✓</span>
                  {strength}
                </li>
              ))
            ) : (
              <li>No specific strengths identified</li>
            )}
          </ul>
        </div>
        <div className="improvements-card">
          <h3>Areas for Improvement</h3>
          <ul>
            {topImprovements.length > 0 ? (
              topImprovements.map((improvement, index) => (
                <li key={index}>
                  <span className="improvement-icon">!</span>
                  {improvement}
                </li>
              ))
            ) : (
              <li>No specific improvements identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Question Review */}
      {interviewData?.questions && (
        <div className="question-review">
          <h2>Question Review</h2>
          <div className="questions-list">
            {interviewData.questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-header" onClick={() => toggleExpand(index)}>
                  <span className="question-number">Q{index + 1}</span>
                  <h3 className="question-text">{question.question}</h3>
                  <span className="dropdown-icon">
                    {expandedItems[index] ? '▲' : '▼'}
                  </span>
                </div>

                {feedbackData[index] && expandedItems[index] && (
                  <div className="collapsible-content">
                    <div className="feedback-section">
                      <div className="section-header">
                        <span className="feedback-icon">📝</span>
                        <h4>Feedback</h4>
                      </div>
                      <div className="feedback-content">
                        {feedbackData[index].concise_feedback}
                      </div>
                    </div>

                    <div className="suggestion-section">
                      <div className="section-header">
                        <span className="suggestion-icon">💡</span>
                        <h4>Suggested Answer</h4>
                      </div>
                      <div className="suggestion-content">
                        {feedbackData[index].suggested_answer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <PDFDownloadLink
          document={
            <InterviewReport
              interviewData={interviewData}
              feedbackData={feedbackData}
              avgTechnical={avgTechnical}
              avgCommunication={avgCommunication}
              avgOverall={avgOverall}
              topStrengths={topStrengths}
              topImprovements={topImprovements}
            />
          }
          fileName="interview-report.pdf"
          className="btn-download"
        >
          {({ loading }) => (loading ? 'Preparing document...' : 'Download Full Report')}
        </PDFDownloadLink>

        <button className="btn-restart" onClick={() => navigate('/interview-question')}>
          Start New Interview
        </button>
        <button className="btn-home" onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default InterviewComplete;