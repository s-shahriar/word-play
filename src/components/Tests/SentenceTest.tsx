import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordRecord } from '../../types';
import { DataManager } from '../../data/DataManager';
import { 
  TestGenerator, 
  SentenceQuestion, 
  SentenceTestResult 
} from '../../services/TestGenerator';
import { ProgressTracker } from '../../services/ProgressTracker';
import './SentenceTest.css';

interface SentenceTestProps {
  questionCount?: number;
  timeLimit?: number; // in seconds
  testMode?: 'multiple-choice' | 'fill-in' | 'mixed';
  onTestComplete?: (results: any) => void;
}

export const SentenceTest: React.FC<SentenceTestProps> = ({
  questionCount = 10,
  timeLimit = 400, // ~6.5 minutes
  testMode = 'multiple-choice',
  onTestComplete
}) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<SentenceTestResult[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [lastScore, setLastScore] = useState<number>(0);

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, [questionCount, testMode]);

  // Timer effect
  useEffect(() => {
    if (startTime && !testCompleted && !showFeedback) {
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
  }, [startTime, testCompleted, showFeedback, timeLimit]);

  const initializeTest = async () => {
    setLoading(true);
    try {
      const allWords = await DataManager.loadWords();
      const testQuestions = TestGenerator.generateSentenceTest(
        allWords, 
        questionCount, 
        testMode === 'multiple-choice'
      );
      
      setQuestions(testQuestions);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      setTimeLeft(timeLimit * 1000);
    } catch (error) {
      console.error('Error initializing sentence test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!questionStartTime) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime.getTime();
    
    const evaluation = TestGenerator.evaluateSentenceAnswer(userAnswer, currentQuestion.correctAnswer);
    
    const result: SentenceTestResult = {
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      score: evaluation.score,
      matchType: evaluation.matchType,
      timeSpent
    };
    
    setResults(prev => [...prev, result]);
    setCurrentFeedback(evaluation.feedback);
    setLastScore(evaluation.score);
    setShowFeedback(true);
    
    // Save individual test result for progress tracking
    ProgressTracker.saveTestResult({
      testType: 'sentence',
      wordId: (currentQuestion.wordRecord as any).id || currentQuestion.wordRecord.word.toLowerCase(),
      correct: evaluation.score >= 0.5, // Consider fuzzy matches as correct
      timeSpent,
      timestamp: new Date(),
      quality: evaluation.score >= 1.0 ? 5 : evaluation.score >= 0.5 ? 4 : evaluation.score > 0 ? 2 : 1
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
      setUserAnswer('');
      setShowFeedback(false);
      setCurrentFeedback('');
    } else {
      handleTestComplete();
    }
  };

  const handleTestComplete = () => {
    if (!startTime) return;
    
    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();
    
    setTestCompleted(true);
    
    if (onTestComplete) {
      const scoreData = TestGenerator.calculateSentenceTestScore(results, totalTime);
      onTestComplete({
        results,
        scoreData,
        startTime,
        endTime
      });
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

  const getFeedbackColor = (score: number): string => {
    if (score >= 1.0) return '#27ae60';
    if (score >= 0.5) return '#f39c12';
    if (score > 0) return '#e67e22';
    return '#e74c3c';
  };

  if (loading) {
    return (
      <div className="sentence-test-loading">
        <div className="loading-spinner"></div>
        <p>Preparing sentence questions...</p>
      </div>
    );
  }

  if (testCompleted) {
    const scoreData = TestGenerator.calculateSentenceTestScore(
      results, 
      startTime ? Date.now() - startTime.getTime() : 0
    );
    
    return (
      <div className="sentence-test-complete">
        <h2>📝 Sentence Test Complete!</h2>
        
        <div className="test-summary">
          <div className="stat">
            <span className="stat-value">{scoreData.totalScore}</span>
            <span className="stat-label">Score</span>
          </div>
          <div className="stat">
            <span className="stat-value">{scoreData.percentage}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
          <div className="stat">
            <span className="stat-value">{scoreData.averageTime}s</span>
            <span className="stat-label">Avg Time</span>
          </div>
        </div>

        <div className="detailed-results">
          <div className="result-breakdown">
            <div className="result-item exact">
              <span className="result-count">{scoreData.exactMatches}</span>
              <span className="result-label">✅ Exact</span>
            </div>
            <div className="result-item fuzzy">
              <span className="result-count">{scoreData.fuzzyMatches}</span>
              <span className="result-label">🟡 Close</span>
            </div>
            <div className="result-item partial">
              <span className="result-count">{scoreData.partialMatches}</span>
              <span className="result-label">🟠 Partial</span>
            </div>
            <div className="result-item wrong">
              <span className="result-count">{scoreData.wrongAnswers}</span>
              <span className="result-label">❌ Wrong</span>
            </div>
          </div>
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
              setUserAnswer('');
              setShowFeedback(false);
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
    <div className="sentence-test">
      <div className="test-header">
        <div className="test-progress">
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
        <h2 className="question-title">Complete the sentence</h2>
        
        <div className="sentence-display">
          <p className="sentence-text">
            {currentQuestion.sentenceWithBlank}
          </p>
          <p className="meaning-hint">
            <strong>Hint:</strong> {currentQuestion.wordRecord.meaning}
          </p>
        </div>
        
        {showFeedback ? (
          <div className="feedback-container">
            <div 
              className="feedback-message"
              style={{ 
                backgroundColor: getFeedbackColor(lastScore),
                color: 'white'
              }}
            >
              {currentFeedback}
            </div>
            
            <div className="question-info">
              <p><strong>Your answer:</strong> {userAnswer}</p>
              <p><strong>Correct answer:</strong> {currentQuestion.correctAnswer}</p>
              <p><strong>Original sentence:</strong> {currentQuestion.originalSentence}</p>
            </div>
            
            <button
              className="next-button"
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'} →
            </button>
          </div>
        ) : (
          <div className="answer-section">
            {testMode === 'multiple-choice' && currentQuestion.choices ? (
              <div className="choices-container">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    className={`choice-button ${userAnswer === choice ? 'selected' : ''}`}
                    onClick={() => setUserAnswer(choice)}
                  >
                    <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="choice-text">{choice}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="fill-in-container">
                <input
                  type="text"
                  className="answer-input"
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && userAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                  }}
                />
                <p className="input-hint">
                  💡 Don't worry about perfect spelling - close answers count too!
                </p>
              </div>
            )}
            
            <div className="test-controls">
              <button
                className="submit-button"
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
              >
                Submit Answer
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="test-navigation">
        <button 
          className="exit-button"
          onClick={() => navigate('/')}
        >
          🚪 Exit Test
        </button>
      </div>
    </div>
  );
};