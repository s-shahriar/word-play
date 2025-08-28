import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataManager } from "../../data/DataManager";
import { ProgressTracker } from "../../services/ProgressTracker";
import { SM2Algorithm } from "../../services/SRS";
import "./Home.css";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalWordsStudied: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    masteredWords: 0,
    dueCards: 0,
    newCards: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      await DataManager.loadWords();
      const overallStats = ProgressTracker.getOverallStats();
      const allProgress = ProgressTracker.getUserProgress();
      const dueWords = SM2Algorithm.getDueWords(allProgress);

      const allWords = DataManager.getWords();
      const allWordIds = allWords.map(
        (w) => (w as any).id || w.word.toLowerCase()
      );
      const newWordIds = SM2Algorithm.getNewWords(allProgress, allWordIds);

      setStats({
        ...overallStats,
        dueCards: dueWords.length,
        newCards: newWordIds.length,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const sessionOptions = [
    {
      id: "due",
      title: "📅 Study Due Cards",
      description: "Review cards scheduled for today",
      count: stats.dueCards,
      color: "#e74c3c",
      disabled: stats.dueCards === 0,
    },
    {
      id: "new",
      title: "✨ Learn New Words",
      description: "Study words you haven't seen before",
      count: stats.newCards,
      color: "#3498db",
      disabled: stats.newCards === 0,
    },
    {
      id: "quick",
      title: "⚡ 10 Quick Cards",
      description: "Quick 10-card practice session",
      count: null,
      color: "#27ae60",
      disabled: false,
    },
    {
      id: "weak",
      title: "💪 Practice Weak Words",
      description: "Focus on words with low accuracy",
      count: null,
      color: "#f39c12",
      disabled: stats.totalWordsStudied === 0,
    },
    {
      id: "random",
      title: "🎲 Random Review",
      description: "Study a random selection of words",
      count: null,
      color: "#9b59b6",
      disabled: false,
    },
  ];

  const handleSessionStart = (sessionType: string) => {
    navigate(`/flashcards/${sessionType}`);
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
        <p>Loading your progress...</p>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1>📚 Word Play</h1>
        <p>Master English vocabulary with spaced repetition</p>
      </div>

      <div className="session-options">
        <h2>Choose Your Study Session</h2>
        <div className="options-grid">
          {sessionOptions.map((option) => (
            <button
              key={option.id}
              className={`session-option ${option.disabled ? "disabled" : ""}`}
              style={{ borderColor: option.color }}
              onClick={() => !option.disabled && handleSessionStart(option.id)}
              disabled={option.disabled}
            >
              <div className="option-header">
                <h3>{option.title}</h3>
                {option.count !== null && (
                  <span
                    className="option-count"
                    style={{ backgroundColor: option.color }}
                  >
                    {option.count}
                  </span>
                )}
              </div>
              <p>{option.description}</p>
              {option.disabled && option.id !== "random" && (
                <div className="disabled-overlay">
                  {option.count === 0
                    ? "No cards available"
                    : "Start studying first"}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button
            className="action-button"
            onClick={() => navigate("/progress")}
          >
            <span className="action-icon">📊</span>
            <span className="action-text">View Progress</span>
          </button>
          <button className="action-button" onClick={() => navigate("/tests")}>
            <span className="action-icon">🧪</span>
            <span className="action-text">Take Tests</span>
          </button>
          <button
            className="action-button"
            onClick={() => navigate("/settings")}
          >
            <span className="action-icon">⚙️</span>
            <span className="action-text">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
