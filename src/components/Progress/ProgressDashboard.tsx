import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressTracker } from '../../services/ProgressTracker';
import { DataManager } from '../../data/DataManager';
import './ProgressDashboard.css';

interface ProgressStats {
  totalWordsStudied: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  currentStreak: number;
  bestStreak: number;
  masteredWords: number;
}

interface TestTypeStats {
  match: { total: number; correct: number; avgTime: number };
  sentence: { total: number; correct: number; avgTime: number };
  synonymAntonym: { total: number; correct: number; avgTime: number };
  flashcard: { total: number; correct: number; avgTime: number };
}

interface DailyActivity {
  date: string;
  testsCompleted: number;
  timeSpent: number;
  accuracy: number;
}

export const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [testTypeStats, setTestTypeStats] = useState<TestTypeStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [weakWords, setWeakWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      // Load overall stats
      const overallStats = ProgressTracker.getOverallStats();
      setStats(overallStats);

      // Load test type statistics
      const testResults = ProgressTracker.getTestResults();
      const testStats: TestTypeStats = {
        match: { total: 0, correct: 0, avgTime: 0 },
        sentence: { total: 0, correct: 0, avgTime: 0 },
        synonymAntonym: { total: 0, correct: 0, avgTime: 0 },
        flashcard: { total: 0, correct: 0, avgTime: 0 }
      };

      testResults.forEach(result => {
        const type = result.testType === 'synonym-antonym' ? 'synonymAntonym' : result.testType as keyof TestTypeStats;
        if (testStats[type]) {
          testStats[type].total++;
          if (result.correct) testStats[type].correct++;
          testStats[type].avgTime += result.timeSpent;
        }
      });

      // Calculate average times
      Object.keys(testStats).forEach(type => {
        const typeKey = type as keyof TestTypeStats;
        if (testStats[typeKey].total > 0) {
          testStats[typeKey].avgTime = Math.round(testStats[typeKey].avgTime / testStats[typeKey].total);
        }
      });

      setTestTypeStats(testStats);

      // Load daily activity (last 7 days)
      const daily = calculateDailyActivity(testResults);
      setDailyActivity(daily);

      // Load weak words
      const weak = ProgressTracker.getWeakWords(8);
      const allWords = await DataManager.loadWords();
      const weakWordsWithData = weak.map(w => {
        const wordData = allWords.find(word => word.word.toLowerCase() === w.wordId || (word as any).id === w.wordId);
        return {
          ...w,
          word: wordData?.word || w.wordId,
          meaning: wordData?.meaning || 'Unknown'
        };
      });
      setWeakWords(weakWordsWithData);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyActivity = (testResults: any[]): DailyActivity[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayResults = testResults.filter(result => 
        result.timestamp.toISOString().split('T')[0] === date
      );

      const testsCompleted = dayResults.length;
      const timeSpent = dayResults.reduce((sum, r) => sum + r.timeSpent, 0);
      const correctResults = dayResults.filter(r => r.correct).length;
      const accuracy = testsCompleted > 0 ? (correctResults / testsCompleted) * 100 : 0;

      return {
        date,
        testsCompleted,
        timeSpent: Math.round(timeSpent / 1000), // Convert to seconds
        accuracy: Math.round(accuracy)
      };
    });
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return '#27ae60';
    if (accuracy >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getMasteryLevel = (accuracy: number): string => {
    if (accuracy >= 90) return 'Expert';
    if (accuracy >= 80) return 'Advanced';
    if (accuracy >= 70) return 'Intermediate';
    if (accuracy >= 60) return 'Beginner';
    return 'Learning';
  };

  const exportProgress = () => {
    const data = ProgressTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordplay-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="progress-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your progress data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="progress-dashboard">
        <div className="no-data">
          <h2>📊 Progress Dashboard</h2>
          <p>No progress data available yet. Start learning to see your statistics!</p>
          <button 
            className="start-learning-button"
            onClick={() => navigate('/')}
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h1>📊 Your Learning Progress</h1>
        <div className="header-actions">
          <button 
            className="export-button"
            onClick={exportProgress}
            title="Export your progress data"
          >
            💾 Export Data
          </button>
          <button 
            className="refresh-button"
            onClick={loadProgressData}
            title="Refresh statistics"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalWordsStudied}</div>
            <div className="stat-label">Words Studied</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: getAccuracyColor(stats.averageAccuracy * 100) }}>
              {Math.round(stats.averageAccuracy * 100)}%
            </div>
            <div className="stat-label">Overall Accuracy</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatTime(stats.totalTimeSpent)}</div>
            <div className="stat-label">Time Invested</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{stats.bestStreak}</div>
            <div className="stat-label">Best Streak</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.masteredWords}</div>
            <div className="stat-label">Mastered Words</div>
          </div>
        </div>
      </div>

      {/* Test Type Performance */}
      {testTypeStats && (
        <div className="test-performance">
          <h2>📈 Performance by Test Type</h2>
          <div className="performance-grid">
            <div className="performance-card match">
              <h3>🎯 Word Matching</h3>
              <div className="performance-stats">
                <div className="perf-stat">
                  <span className="perf-value">{testTypeStats.match.total}</span>
                  <span className="perf-label">Tests</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value" style={{ color: getAccuracyColor(testTypeStats.match.total > 0 ? (testTypeStats.match.correct / testTypeStats.match.total) * 100 : 0) }}>
                    {testTypeStats.match.total > 0 ? Math.round((testTypeStats.match.correct / testTypeStats.match.total) * 100) : 0}%
                  </span>
                  <span className="perf-label">Accuracy</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value">{formatTime(testTypeStats.match.avgTime)}</span>
                  <span className="perf-label">Avg Time</span>
                </div>
              </div>
            </div>

            <div className="performance-card sentence">
              <h3>📝 Sentence Fill</h3>
              <div className="performance-stats">
                <div className="perf-stat">
                  <span className="perf-value">{testTypeStats.sentence.total}</span>
                  <span className="perf-label">Tests</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value" style={{ color: getAccuracyColor(testTypeStats.sentence.total > 0 ? (testTypeStats.sentence.correct / testTypeStats.sentence.total) * 100 : 0) }}>
                    {testTypeStats.sentence.total > 0 ? Math.round((testTypeStats.sentence.correct / testTypeStats.sentence.total) * 100) : 0}%
                  </span>
                  <span className="perf-label">Accuracy</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value">{formatTime(testTypeStats.sentence.avgTime)}</span>
                  <span className="perf-label">Avg Time</span>
                </div>
              </div>
            </div>

            <div className="performance-card synonym">
              <h3>🔄 Synonym/Antonym</h3>
              <div className="performance-stats">
                <div className="perf-stat">
                  <span className="perf-value">{testTypeStats.synonymAntonym.total}</span>
                  <span className="perf-label">Tests</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value" style={{ color: getAccuracyColor(testTypeStats.synonymAntonym.total > 0 ? (testTypeStats.synonymAntonym.correct / testTypeStats.synonymAntonym.total) * 100 : 0) }}>
                    {testTypeStats.synonymAntonym.total > 0 ? Math.round((testTypeStats.synonymAntonym.correct / testTypeStats.synonymAntonym.total) * 100) : 0}%
                  </span>
                  <span className="perf-label">Accuracy</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value">{formatTime(testTypeStats.synonymAntonym.avgTime)}</span>
                  <span className="perf-label">Avg Time</span>
                </div>
              </div>
            </div>

            <div className="performance-card flashcard">
              <h3>🎴 Flashcards</h3>
              <div className="performance-stats">
                <div className="perf-stat">
                  <span className="perf-value">{testTypeStats.flashcard.total}</span>
                  <span className="perf-label">Reviews</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value" style={{ color: getAccuracyColor(testTypeStats.flashcard.total > 0 ? (testTypeStats.flashcard.correct / testTypeStats.flashcard.total) * 100 : 0) }}>
                    {testTypeStats.flashcard.total > 0 ? Math.round((testTypeStats.flashcard.correct / testTypeStats.flashcard.total) * 100) : 0}%
                  </span>
                  <span className="perf-label">Accuracy</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-value">{formatTime(testTypeStats.flashcard.avgTime)}</span>
                  <span className="perf-label">Avg Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Activity Chart */}
      <div className="activity-chart">
        <h2>📅 Weekly Activity</h2>
        <div className="chart-container">
          <div className="chart-bars">
            {dailyActivity.map((day, index) => {
              const maxTests = Math.max(...dailyActivity.map(d => d.testsCompleted), 1);
              const height = Math.max((day.testsCompleted / maxTests) * 100, 2);
              const dayName = new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
              
              return (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: day.testsCompleted > 0 ? '#3498db' : '#ecf0f1'
                    }}
                    title={`${dayName}: ${day.testsCompleted} tests, ${day.timeSpent}s, ${day.accuracy}% accuracy`}
                  ></div>
                  <div className="chart-label">{dayName}</div>
                  <div className="chart-value">{day.testsCompleted}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Words Needing Attention */}
      {weakWords.length > 0 && (
        <div className="weak-words">
          <h2>📚 Words Needing Attention</h2>
          <div className="weak-words-grid">
            {weakWords.map((word, index) => (
              <div key={index} className="weak-word-card">
                <div className="word-header">
                  <h3>{word.word}</h3>
                  <span className="accuracy-badge" style={{ backgroundColor: getAccuracyColor(word.accuracy * 100) }}>
                    {Math.round(word.accuracy * 100)}%
                  </span>
                </div>
                <p className="word-meaning">{word.meaning}</p>
                <div className="word-stats">
                  <span className="stat-item">
                    <span className="stat-icon">👁️</span>
                    {word.totalSeen} seen
                  </span>
                  <span className="stat-item">
                    <span className="stat-icon">📊</span>
                    {getMasteryLevel(word.accuracy * 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="dashboard-navigation">
        <button 
          className="nav-button primary"
          onClick={() => navigate('/')}
        >
          🏠 Dashboard
        </button>
        <button 
          className="nav-button secondary"
          onClick={() => navigate('/flashcards/weak')}
        >
          📚 Practice Weak Words
        </button>
        <button 
          className="nav-button secondary"
          onClick={() => navigate('/tests')}
        >
          📝 Take Tests
        </button>
      </div>
    </div>
  );
};