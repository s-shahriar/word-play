import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordRecord } from '../../types';
import { DataManager } from '../../data/DataManager';
import { TestGenerator, MatchQuestion, TestResult, TestSession } from '../../services/TestGenerator';
import { ProgressTracker } from '../../services/ProgressTracker';
import './MatchTest.css';

interface MatchTestProps {
  questionCount?: number;
  timeLimit?: number; // in seconds
  onTestComplete?: (session: TestSession) => void;
}

export const MatchTest: React.FC<MatchTestProps> = ({
  questionCount = 10,
  timeLimit = 300, // 5 minutes default
  onTestComplete
}) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<MatchQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, [questionCount]);

  // Timer effect
  useEffect(() => {
    if (startTime && !testCompleted) {
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime.getTime();
        const remaining = Math.max(0, (timeLimit * 1000) - elapsed);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          handleTestComplete();
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [startTime, testCompleted, timeLimit]);

  const initializeTest = async () => {
    setLoading(true);
    try {
      const allWords = await DataManager.loadWords();
      if (allWords.length < questionCount) {
        throw new Error(`Not enough words available for test`);
      }
      
      const testQuestions = TestGenerator.generateMatchTest(allWords, questionCount);
      setQuestions(testQuestions);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      setTimeLeft(timeLimit * 1000);
    } catch (error) {
      console.error('Error initializing test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !questionStartTime) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime.getTime();
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const result: TestResult = {
      questionId: currentQuestion.id,
      selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent
    };
    
    setResults(prev => [...prev, result]);
    
    // Save individual test result for progress tracking
    ProgressTracker.saveTestResult({
      testType: 'match',
      wordId: (currentQuestion.wordRecord as any).id || currentQuestion.word.toLowerCase(),
      correct: isCorrect,
      timeSpent,
      timestamp: new Date(),
      quality: isCorrect ? (timeSpent < 3000 ? 5 : timeSpent < 6000 ? 4 : 3) : 1
    });
    
    // Move to next question or complete test
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
      setSelectedAnswer('');
    } else {
      handleTestComplete();
    }
  };

  const handleTestComplete = () => {
    if (!startTime) return;
    
    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();
    const scoreData = TestGenerator.calculateScore(results, totalTime, timeLimit * 1000);
    
    const session: TestSession = {
      questions,
      results,
      startTime,
      endTime,
      score: scoreData.score,
      totalQuestions: questions.length,
      correctAnswers: scoreData.correctAnswers,
      averageTime: scoreData.averageTime,
      timeBonus: scoreData.timeBonus
    };
    
    setTestCompleted(true);
    
    if (onTestComplete) {
      onTestComplete(session);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    const percentage = timeLeft / (timeLimit * 1000);
    if (percentage > 0.5) return '#27ae60';
    if (percentage > 0.2) return '#f39c12';
    return '#e74c3c';
  };

  if (loading) {
    return (
      <div className="match-test-loading">
        <div className="loading-spinner"></div>
        <p>Generating test questions...</p>
      </div>
    );
  }

  if (testCompleted) {
    const accuracy = results.length > 0 ? results.filter(r => r.isCorrect).length / results.length : 0;
    const averageTime = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length / 1000 : 0;
    
    const difficultyData = TestGenerator.getDifficultyLevel(accuracy, averageTime);
    
    return (
      <div className="match-test-complete">
        <h2>🎉 Test Complete!</h2>
        
        <div className="test-summary">
          <div className="stat">
            <span className="stat-value">{results.filter(r => r.isCorrect).length}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Math.round(accuracy * 100)}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
          <div className="stat">
            <span className="stat-value">{averageTime.toFixed(1)}s</span>
            <span className="stat-label">Avg Time</span>
          </div>
        </div>
        
        <div className="difficulty-assessment">
          <h3>Performance Level: <span className={`level ${difficultyData.level}`}>{difficultyData.level}</span></h3>
          <p>{difficultyData.description}</p>
          <p className="recommendation"><strong>Next:</strong> {difficultyData.nextRecommendation}</p>
        </div>
        
        <div className="completion-buttons">
          <button 
            className="dashboard-button"
            onClick={() => navigate('/')}
          >
            🏠 Dashboard
          </button>
          <button 
            className="new-test-button"
            onClick={() => {
              setTestCompleted(false);
              setCurrentQuestionIndex(0);
              setResults([]);
              setSelectedAnswer('');
              initializeTest();
            }}
          >
            🔄 New Test
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="match-test">
      <div className="test-header">
        <div className="session-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        
        <div className="test-timer" style={{ color: getTimeColor() }}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="question-container">
        <h2 className="question-title">What does this word mean?</h2>
        <div className="word-display">
          <div className="word-box">
            <h1 className="target-word">{currentQuestion.word}</h1>
          </div>
        </div>
        
        <div className="choices-container">
          {currentQuestion.choices.map((choice, index) => (
            <button
              key={index}
              className={`choice-button ${selectedAnswer === choice ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(choice)}
            >
              <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
              <span className="choice-text">{choice}</span>
            </button>
          ))}
        </div>
        
        <div className="test-controls">
          <button
            className="submit-button"
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'} →
          </button>
        </div>
      </div>
      
      <div className="test-navigation">
        <button 
          className="exit-button"
          onClick={() => navigate('/')}
          title="Exit Test"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
};