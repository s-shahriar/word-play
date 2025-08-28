import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordRecord } from '../../types';
import { DataManager } from '../../data/DataManager';
import { 
  TestGenerator, 
  SynonymAntonymQuestion, 
  SynonymAntonymTestResult 
} from '../../services/TestGenerator';
import { ProgressTracker } from '../../services/ProgressTracker';
import './SynonymAntonymTest.css';

interface SynonymAntonymTestProps {
  questionCount?: number;
  timeLimit?: number; // in seconds
  choicesCount?: number;
  onTestComplete?: (results: any) => void;
}

export const SynonymAntonymTest: React.FC<SynonymAntonymTestProps> = ({
  questionCount = 8,
  timeLimit = 480, // 8 minutes
  choicesCount = 6,
  onTestComplete
}) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SynonymAntonymQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<SynonymAntonymTestResult[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedSynonyms, setSelectedSynonyms] = useState<string[]>([]);
  const [selectedAntonyms, setSelectedAntonyms] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, [questionCount, choicesCount]);

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
      const testQuestions = TestGenerator.generateSynonymAntonymTest(
        allWords, 
        questionCount,
        choicesCount
      );
      
      setQuestions(testQuestions);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      setTimeLeft(timeLimit * 1000);
    } catch (error) {
      console.error('Error initializing synonym/antonym test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSynonymToggle = (synonym: string) => {
    setSelectedSynonyms(prev => 
      prev.includes(synonym)
        ? prev.filter(s => s !== synonym)
        : [...prev, synonym]
    );
  };

  const handleAntonymToggle = (antonym: string) => {
    setSelectedAntonyms(prev => 
      prev.includes(antonym)
        ? prev.filter(a => a !== antonym)
        : [...prev, antonym]
    );
  };

  const handleSubmitAnswer = () => {
    if (!questionStartTime) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime.getTime();
    
    const evaluation = TestGenerator.evaluateSynonymAntonymAnswer(
      selectedSynonyms,
      selectedAntonyms,
      currentQuestion.correctSynonyms,
      currentQuestion.correctAntonyms
    );
    
    const result: SynonymAntonymTestResult = {
      questionId: currentQuestion.id,
      selectedSynonyms: [...selectedSynonyms],
      selectedAntonyms: [...selectedAntonyms],
      correctSynonyms: currentQuestion.correctSynonyms,
      correctAntonyms: currentQuestion.correctAntonyms,
      synonymScore: evaluation.synonymScore,
      antonymScore: evaluation.antonymScore,
      overallScore: evaluation.overallScore,
      timeSpent
    };
    
    setResults(prev => [...prev, result]);
    setCurrentFeedback(evaluation);
    setShowFeedback(true);
    
    // Save individual test result for progress tracking
    ProgressTracker.saveTestResult({
      testType: 'synonym-antonym',
      wordId: (currentQuestion.wordRecord as any).id || currentQuestion.wordRecord.word.toLowerCase(),
      correct: evaluation.overallScore >= 0.7, // Consider good scores as correct
      timeSpent,
      timestamp: new Date(),
      quality: evaluation.overallScore >= 0.9 ? 5 : evaluation.overallScore >= 0.7 ? 4 : evaluation.overallScore >= 0.5 ? 3 : evaluation.overallScore > 0 ? 2 : 1
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
      setSelectedSynonyms([]);
      setSelectedAntonyms([]);
      setShowFeedback(false);
      setCurrentFeedback(null);
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
      const scoreData = TestGenerator.calculateSynonymAntonymTestScore(results, totalTime);
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

  if (loading) {
    return (
      <div className="synonym-antonym-test-loading">
        <div className="loading-spinner"></div>
        <p>Preparing synonym and antonym questions...</p>
      </div>
    );
  }

  if (testCompleted) {
    const scoreData = TestGenerator.calculateSynonymAntonymTestScore(
      results, 
      startTime ? Date.now() - startTime.getTime() : 0
    );
    
    return (
      <div className="synonym-antonym-test-complete">
        <h2>🔄 Synonym/Antonym Test Complete!</h2>
        
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
          <div className="performance-breakdown">
            <div className="performance-item synonym">
              <h3>📖 Synonyms</h3>
              <span className="performance-score">{Math.round(scoreData.averageSynonymScore * 100)}%</span>
            </div>
            <div className="performance-item antonym">
              <h3>🔄 Antonyms</h3>
              <span className="performance-score">{Math.round(scoreData.averageAntonymScore * 100)}%</span>
            </div>
          </div>

          <div className="result-breakdown">
            <div className="result-item perfect">
              <span className="result-count">{scoreData.perfectScores}</span>
              <span className="result-label">🎯 Excellent</span>
            </div>
            <div className="result-item good">
              <span className="result-count">{scoreData.goodScores}</span>
              <span className="result-label">👍 Good</span>
            </div>
            <div className="result-item needs-work">
              <span className="result-count">{scoreData.needsWork}</span>
              <span className="result-label">📚 Needs Work</span>
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
              setSelectedSynonyms([]);
              setSelectedAntonyms([]);
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
  const hasSelections = selectedSynonyms.length > 0 || selectedAntonyms.length > 0;

  return (
    <div className="synonym-antonym-test">
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
        <div className="word-display">
          <div className="word-box">
            <h1 className="target-word">{currentQuestion.word}</h1>
            <p className="word-meaning">{currentQuestion.meaning}</p>
          </div>
        </div>
        
        {showFeedback ? (
          <div className="feedback-container">
            <div className="feedback-scores">
              <div className="feedback-score synonym">
                <h3>📖 Synonyms</h3>
                <div className="score-value">{Math.round(currentFeedback.synonymScore * 100)}%</div>
                <div className="score-feedback">{currentFeedback.synonymFeedback}</div>
              </div>
              <div className="feedback-score antonym">
                <h3>🔄 Antonyms</h3>
                <div className="score-value">{Math.round(currentFeedback.antonymScore * 100)}%</div>
                <div className="score-feedback">{currentFeedback.antonymFeedback}</div>
              </div>
            </div>

            <div className="answer-review">
              <div className="review-section">
                <h4>Your Synonym Selections:</h4>
                <div className="selection-review">
                  {selectedSynonyms.map((syn, index) => (
                    <span 
                      key={index} 
                      className={`selection-item ${currentQuestion.correctSynonyms.includes(syn) ? 'correct' : 'incorrect'}`}
                    >
                      {syn} {currentQuestion.correctSynonyms.includes(syn) ? '✅' : '❌'}
                    </span>
                  ))}
                </div>
                <div className="correct-answers">
                  <strong>Correct synonyms:</strong> {currentQuestion.correctSynonyms.join(', ')}
                </div>
              </div>

              <div className="review-section">
                <h4>Your Antonym Selections:</h4>
                <div className="selection-review">
                  {selectedAntonyms.map((ant, index) => (
                    <span 
                      key={index} 
                      className={`selection-item ${currentQuestion.correctAntonyms.includes(ant) ? 'correct' : 'incorrect'}`}
                    >
                      {ant} {currentQuestion.correctAntonyms.includes(ant) ? '✅' : '❌'}
                    </span>
                  ))}
                </div>
                <div className="correct-answers">
                  <strong>Correct antonyms:</strong> {currentQuestion.correctAntonyms.join(', ')}
                </div>
              </div>
            </div>

            <div className="overall-feedback">
              {currentFeedback.overallFeedback}
            </div>
            
            <button
              className="next-button"
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'} →
            </button>
          </div>
        ) : (
          <div className="selection-section">
            <div className="selection-container">
              <div className="selection-group synonyms">
                <h3>📖 Select Synonyms (words with similar meaning):</h3>
                <div className="choices-grid">
                  {currentQuestion.synonymChoices.map((synonym, index) => (
                    <button
                      key={index}
                      className={`choice-button ${selectedSynonyms.includes(synonym) ? 'selected' : ''}`}
                      onClick={() => handleSynonymToggle(synonym)}
                    >
                      {synonym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="selection-group antonyms">
                <h3>🔄 Select Antonyms (words with opposite meaning):</h3>
                <div className="choices-grid">
                  {currentQuestion.antonymChoices.map((antonym, index) => (
                    <button
                      key={index}
                      className={`choice-button ${selectedAntonyms.includes(antonym) ? 'selected' : ''}`}
                      onClick={() => handleAntonymToggle(antonym)}
                    >
                      {antonym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="test-controls">
              <button
                className="submit-button"
                onClick={handleSubmitAnswer}
                disabled={!hasSelections}
              >
                Submit Answers
              </button>
            </div>
          </div>
        )}
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