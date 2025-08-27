import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordRecord, Quality, UserProgress, FlashcardSession as FlashcardSessionType } from '../../types';
import { DataManager } from '../../data/DataManager';
import { SM2Algorithm } from '../../services/SRS';
import { ProgressTracker } from '../../services/ProgressTracker';
import { Flashcard } from '../Flashcard/Flashcard';
import './FlashcardSession.css';

interface FlashcardSessionProps {
  sessionType?: 'due' | 'new' | 'weak' | 'random';
  maxCards?: number;
  onSessionEnd?: (stats: any) => void;
}

export const FlashcardSession: React.FC<FlashcardSessionProps> = ({
  sessionType = 'due',
  maxCards = 20,
  onSessionEnd
}) => {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState<FlashcardSessionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctAnswers: 0,
    totalTime: 0,
    startTime: new Date()
  });

  useEffect(() => {
    initializeSession();
  }, [sessionType, maxCards]);

  const initializeSession = async () => {
    setLoading(true);
    
    try {
      const allWords = await DataManager.loadWords();
      const allProgress = ProgressTracker.getUserProgress();
      let sessionWords: WordRecord[] = [];

      switch (sessionType) {
        case 'due':
          const dueProgress = SM2Algorithm.getDueWords(allProgress);
          sessionWords = dueProgress
            .map(progress => allWords.find(w => (w as any).id === progress.wordId))
            .filter((w): w is WordRecord => w !== undefined)
            .slice(0, maxCards);
          break;

        case 'new':
          const allWordIds = allWords.map(w => (w as any).id || w.word.toLowerCase());
          const newWordIds = SM2Algorithm.getNewWords(allProgress, allWordIds, maxCards);
          sessionWords = newWordIds
            .map(id => allWords.find(w => (w as any).id === id || w.word.toLowerCase() === id))
            .filter((w): w is WordRecord => w !== undefined);
          break;

        case 'weak':
          const weakProgress = ProgressTracker.getWeakWords(maxCards);
          sessionWords = weakProgress
            .map(progress => allWords.find(w => (w as any).id === progress.wordId))
            .filter((w): w is WordRecord => w !== undefined);
          break;

        case 'random':
        default:
          sessionWords = DataManager.getRandomWords(maxCards);
          break;
      }

      if (sessionWords.length === 0) {
        sessionWords = DataManager.getRandomWords(Math.min(maxCards, 10));
      }

      setWords(sessionWords);
      
      const newSession: FlashcardSessionType = {
        id: `session-${Date.now()}`,
        startTime: new Date(),
        cardsStudied: 0,
        correctAnswers: 0,
        averageTime: 0
      };
      
      setSession(newSession);
      setSessionStats({
        cardsStudied: 0,
        correctAnswers: 0,
        totalTime: 0,
        startTime: new Date()
      });
      
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualitySelect = (quality: Quality) => {
    if (!words[currentIndex] || !session) return;

    const currentWord = words[currentIndex];
    const wordId = (currentWord as any).id || currentWord.word.toLowerCase();
    const cardStartTime = sessionStats.startTime;
    const timeSpent = Date.now() - cardStartTime.getTime();
    
    let userProgress = ProgressTracker.getProgressForWord(wordId);
    
    if (!userProgress) {
      userProgress = SM2Algorithm.initializeUserProgress(wordId);
    }

    const updatedProgress = SM2Algorithm.updateUserProgress(userProgress, quality);
    ProgressTracker.updateWordProgress(updatedProgress);

    const testResult = {
      testType: 'flashcard' as const,
      wordId,
      correct: quality >= 3,
      timeSpent,
      timestamp: new Date(),
      quality
    };
    
    ProgressTracker.saveTestResult(testResult);

    const newStats = {
      ...sessionStats,
      cardsStudied: sessionStats.cardsStudied + 1,
      correctAnswers: sessionStats.correctAnswers + (quality >= 3 ? 1 : 0),
      totalTime: sessionStats.totalTime + timeSpent,
      startTime: new Date()
    };
    
    setSessionStats(newStats);

    const updatedSession: FlashcardSessionType = {
      ...session,
      cardsStudied: newStats.cardsStudied,
      correctAnswers: newStats.correctAnswers,
      averageTime: newStats.totalTime / newStats.cardsStudied
    };

    if (currentIndex === words.length - 1) {
      updatedSession.endTime = new Date();
      ProgressTracker.saveFlashcardSession(updatedSession);
      
      if (onSessionEnd) {
        onSessionEnd({
          ...newStats,
          accuracy: newStats.correctAnswers / newStats.cardsStudied,
          totalCards: words.length
        });
      }
    } else {
      ProgressTracker.saveFlashcardSession(updatedSession);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSessionStats({
        ...sessionStats,
        startTime: new Date()
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSessionStats({
        ...sessionStats,
        startTime: new Date()
      });
    }
  };

  if (loading) {
    return (
      <div className="flashcard-session-loading">
        <div className="loading-spinner"></div>
        <p>Loading flashcard session...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flashcard-session-empty">
        <h2>No cards available</h2>
        <p>
          {sessionType === 'due' && 'No cards are due for review right now.'}
          {sessionType === 'new' && 'No new cards available.'}
          {sessionType === 'weak' && 'No weak words found. Keep studying!'}
          {sessionType === 'random' && 'No words available.'}
        </p>
        <button 
          className="retry-button"
          onClick={() => initializeSession()}
        >
          Try Different Session
        </button>
      </div>
    );
  }

  if (currentIndex >= words.length) {
    const accuracy = sessionStats.correctAnswers / sessionStats.cardsStudied;
    const avgTimePerCard = sessionStats.totalTime / sessionStats.cardsStudied / 1000;

    return (
      <div className="flashcard-session-complete">
        <h2>🎉 Session Complete!</h2>
        <div className="session-summary">
          <div className="stat">
            <span className="stat-value">{sessionStats.cardsStudied}</span>
            <span className="stat-label">Cards Studied</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Math.round(accuracy * 100)}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
          <div className="stat">
            <span className="stat-value">{avgTimePerCard.toFixed(1)}s</span>
            <span className="stat-label">Avg Time/Card</span>
          </div>
        </div>
        <div className="completion-buttons">
          <button 
            className="dashboard-button"
            onClick={() => navigate('/')}
          >
            🏠 Back to Dashboard
          </button>
          <button 
            className="new-session-button"
            onClick={() => initializeSession()}
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-session">
      <div className="session-header">
        <h2>
          {sessionType === 'due' && '📅 Due Cards'}
          {sessionType === 'new' && '✨ New Cards'}
          {sessionType === 'weak' && '💪 Practice Weak Words'}
          {sessionType === 'random' && '🎲 Random Review'}
        </h2>
        <div className="session-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentIndex + 1} of {words.length}
          </span>
        </div>
      </div>

      <Flashcard
        word={words[currentIndex]}
        onQualitySelect={handleQualitySelect}
        onNext={handleNext}
        onPrevious={handlePrevious}
        canGoNext={currentIndex < words.length - 1}
        canGoPrevious={currentIndex > 0}
        currentIndex={currentIndex}
        totalCount={words.length}
      />
    </div>
  );
};