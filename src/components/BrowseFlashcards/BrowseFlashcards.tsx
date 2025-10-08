import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataManager } from '../../data/DataManager';
import { WordRecord } from '../../types';
import './BrowseFlashcards.css';

export const BrowseFlashcards: React.FC = () => {
  const navigate = useNavigate();
  const { letter } = useParams<{ letter: string }>();
  const [words, setWords] = useState<WordRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWordsForLetter();
  }, [letter]);

  const loadWordsForLetter = async () => {
    setLoading(true);
    try {
      const allWords = await DataManager.loadWords();
      const filteredWords = allWords.filter(
        (word) => word.word.charAt(0).toUpperCase() === letter?.toUpperCase()
      );

      // Sort alphabetically
      filteredWords.sort((a, b) => a.word.localeCompare(b.word));

      setWords(filteredWords);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error loading words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (isFlipped) {
        handleNext();
      } else {
        handleFlip();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevious();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleFlip();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentIndex, isFlipped, words]);

  if (loading) {
    return (
      <div className="browse-flashcards-loading">
        <div className="loading-spinner"></div>
        <p>Loading words...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="browse-flashcards-empty">
        <h2>No words found</h2>
        <p>No words starting with "{letter}" found in your vocabulary.</p>
        <button className="back-button" onClick={() => navigate('/browse')}>
          ← Back to Alphabet
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="browse-flashcards">
      <div className="browse-header">
        <h2>
          <span className="letter-badge">{letter}</span>
          Browse Mode
        </h2>
      </div>

      <div className="progress-info">
        {currentIndex + 1} of {words.length}
      </div>

      <div className="browse-progress-bar">
        <div
          className="browse-progress-fill"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      <div className="browse-card-container">
        <div
          className={`browse-flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={handleFlip}
        >
          <div className="card-face card-front">
            <div className="card-label">Word</div>
            <div className="card-word">{currentWord.word}</div>
            <div className="card-hint">Click or press Space to see meaning</div>
          </div>

          <div className="card-face card-back">
            <div className="card-label">Meaning</div>
            <div className="card-word-title">{currentWord.word}</div>

            <div className="card-content">
              <div className="card-meaning-text">
                <strong>📖 Meaning</strong>
                {currentWord.meaning}
              </div>

              {currentWord.example && (
                <div className="card-detail">
                  <strong>💬 Example</strong>
                  {currentWord.example}
                </div>
              )}

              {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                <div className="card-detail">
                  <strong>🔄 Synonyms</strong>
                  {currentWord.synonyms.join(', ')}
                </div>
              )}

              {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                <div className="card-detail">
                  <strong>⚡ Antonyms</strong>
                  {currentWord.antonyms.join(', ')}
                </div>
              )}
            </div>

            <div className="card-hint">Click to flip back</div>
          </div>
        </div>
      </div>

      <div className="browse-controls">
        <button className="flip-button" onClick={handleFlip}>
          {isFlipped ? 'Hide Meaning' : 'Show Meaning'}
        </button>

        <div className="nav-buttons">
          <button
            className="nav-button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            ◀
          </button>

          <button
            className="nav-button home-button"
            onClick={() => navigate('/browse')}
          >
            🏠
          </button>

          <button
            className="nav-button next"
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
