import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // For navigation links
import { Bar } from 'react-chartjs-2';    // For charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  // Local state for transcript, positivity score, error messages, and chart data.
  const [transcript, setTranscript] = useState('');
  const [positivityScore, setPositivityScore] = useState(null);
  const [error, setError] = useState(null);

  // Dummy chart data for additional analytics (this data might eventually come from your backend)
  const [chartData, setChartData] = useState({
    labels: ['Session 1', 'Session 2', 'Session 3', 'Session 4'],
    datasets: [
      {
        label: 'Positivity Score',
        data: [0.7, 0.5, 0.8, 0.6],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  });

  // Fetch transcript and positivity score from the backend when the component mounts.
  useEffect(() => {
    fetch('http://127.0.0.1:5000/get_transcript')
      .then((res) => res.json())
      .then((data) => {
        setTranscript(data.transcript);
      })
      .catch((err) => {
        console.error('Error fetching transcript:', err);
        setError('Failed to fetch transcript.');
      });

    fetch('http://127.0.0.1:5000/get_score')
      .then((res) => res.json())
      .then((data) => {
        setPositivityScore(data.positivity_score);
      })
      .catch((err) => {
        console.error('Error fetching positivity score:', err);
        setError('Failed to fetch positivity score.');
      });
  }, []);

  return (
    <div className="container mx-auto p-4">
      {/* Navigation Menu */}
      <nav className="bg-blue-500 p-4 rounded mb-4 text-white">
        <ul className="flex space-x-4">
          <li>
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/live-interview" className="hover:underline">
              Live Interview
            </Link>
          </li>
          <li>
            <Link to="/history" className="hover:underline">
              Interview History
            </Link>
          </li>
          <li>
            <Link to="/profile" className="hover:underline">
              Profile
            </Link>
          </li>
        </ul>
      </nav>

      <h1 className="text-3xl font-bold text-center mb-6">Dashboard</h1>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Transcript Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Latest Transcript</h2>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          value={transcript}
          readOnly
          rows="10"
        />
      </section>

      {/* Positivity Score Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Positivity Score</h2>
        <p className="text-xl font-bold">
          {positivityScore !== null ? positivityScore : 'Loading...'}
        </p>
      </section>

      {/* Additional Analytics Section (Chart) */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Interview Analytics</h2>
        <div className="bg-white shadow rounded p-4">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Positivity Scores Over Sessions',
                },
              },
            }}
          />
        </div>
      </section>

      {/* Informational Note */}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>
          You might add navigation menus, charts, or additional analytics.
          Consider using a state management library (like Redux) if your application grows larger.
          You can also enhance the styling using TailwindCSS or other UI libraries for a better look and feel.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
