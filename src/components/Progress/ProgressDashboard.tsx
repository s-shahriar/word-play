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

  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateDailyActivity = (testResults: any[]): DailyActivity[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return getLocalDateString(date);
    }).reverse();

    return last7Days.map(date => {
      const dayResults = testResults.filter(result => 
        getLocalDateString(result.timestamp) === date
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
        <div className="header-text">
          <p className="greeting">Hello learner,</p>
          <h1>Your Progress</h1>
        </div>
        <div className="header-actions">
          <button 
            className="settings-button"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalWordsStudied.toLocaleString()}</div>
            <div className="stat-label">Words Studied</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">
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
            <div className="stat-value streak-fire">
              {stats.currentStreak} <span style={{fontSize: '1rem'}}>🔥</span>
            </div>
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
          <h2>Performance Breakdown</h2>
          <div className="performance-grid">
            {[
              { key: 'match', title: 'Word Matching', stats: testTypeStats.match },
              { key: 'sentence', title: 'Sentence Fill', stats: testTypeStats.sentence },
              { key: 'synonymAntonym', title: 'Synonym/Antonym', stats: testTypeStats.synonymAntonym },
              { key: 'flashcard', title: 'Flashcards', stats: testTypeStats.flashcard }
            ].map(({ key, title, stats }) => {
              const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              const getPerformanceClass = (acc: number) => {
                if (acc >= 80) return 'high';
                if (acc >= 60) return 'medium';
                return 'low';
              };
              const performanceClass = getPerformanceClass(accuracy);
              
              return (
                <div key={key} className="performance-item">
                  <div className="performance-header">
                    <h3 className="performance-title">{title}</h3>
                    <span className={`performance-percentage ${performanceClass}`}>
                      {accuracy}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${performanceClass}`}
                      style={{ width: `${accuracy}%` }}
                    ></div>
                  </div>
                  <div className="performance-stats">
                    <span className="performance-stat">{stats.total} Tests</span>
                    <span className="performance-stat">Avg. {Math.round(stats.avgTime / 1000)}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Activity Chart */}
      <div className="activity-chart">
        <h2>Weekly Activity</h2>
        <div className="chart-container">
          <div className="chart-bars">
            {dailyActivity.map((day, index) => {
              const maxTests = Math.max(...dailyActivity.map(d => d.testsCompleted), 1);
              const height = Math.max((day.testsCompleted / maxTests) * 100, 8);
              const dayName = new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
              const isToday = new Date(day.date).toDateString() === new Date().toDateString();
              
              return (
                <div key={index} className="chart-bar-container">
                  <div 
                    className={`chart-bar ${isToday ? 'today' : ''}`}
                    style={{ 
                      height: `${height}%`,
                      background: day.testsCompleted > 0 
                        ? 'linear-gradient(to top, #8e7ff7, #6c56f4)' 
                        : '#e2e8f0'
                    }}
                    title={`${dayName}: ${day.testsCompleted} tests, ${day.timeSpent}s, ${day.accuracy}% accuracy`}
                  ></div>
                  <div className={`chart-label ${isToday ? 'today' : ''}`}>
                    {dayName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="action-button primary"
          onClick={() => navigate('/flashcards/new')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5,3 19,12 5,21"></polygon>
          </svg>
          Start New Practice
        </button>
        <button 
          className="action-button secondary"
          onClick={() => navigate('/flashcards/weak')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            <polyline points="12,7 12,13"></polyline>
            <polyline points="12,17 12,17"></polyline>
          </svg>
          Review Weak Words
        </button>
        <button 
          className="action-button tertiary"
          onClick={() => navigate('/')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9,22 9,12 15,12 15,22"></polyline>
          </svg>
          Dashboard
        </button>
      </div>
    </div>
  );
};