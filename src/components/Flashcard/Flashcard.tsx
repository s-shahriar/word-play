import React, { useState } from 'react';
import { WordRecord, Quality } from '../../types';
import { useNavigate } from 'react-router-dom';
import './Flashcard.css';

interface FlashcardProps {
  word: WordRecord;
  onQualitySelect: (quality: Quality) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentIndex: number;
  totalCount: number;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  onQualitySelect,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentIndex,
  totalCount
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const navigate = useNavigate();


  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setShowMeaning(true);
    }
  };

  const handleQualitySelect = (quality: Quality) => {
    onQualitySelect(quality);
    setIsFlipped(false);
    setShowMeaning(false);
  };

  const qualityButtons = [
    { quality: 0 as Quality, label: 'Again', color: '#ff4757', description: 'Complete blackout' },
    { quality: 1 as Quality, label: 'Hard', color: '#ff6b7d', description: 'Incorrect, but remembered' },
    { quality: 2 as Quality, label: 'Good', color: '#ffa502', description: 'Correct with difficulty' },
    { quality: 3 as Quality, label: 'Good+', color: '#2ed573', description: 'Correct with hesitation' },
    { quality: 4 as Quality, label: 'Easy', color: '#1e90ff', description: 'Correct with ease' },
    { quality: 5 as Quality, label: 'Perfect', color: '#5352ed', description: 'Perfect response' }
  ];

  return (
    <div className="flashcard-container">
      <div className="flashcard-header">
        <div className="progress-info">
          Card {currentIndex + 1} of {totalCount}
        </div>
      </div>

      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <div className="word-display">
            <h1 className="word">{word.word}</h1>
          </div>
          
          {showMeaning && (
            <div className="meaning-section">
              <div className="meaning">
                <strong>Meaning:</strong> {word.meaning}
              </div>
            </div>
          )}
        </div>

        <div className="flashcard-back">
          <div className="word-details">
            <h2 className="word">{word.word}</h2>
            <div className="meaning">
              <strong>Meaning:</strong> {word.meaning}
            </div>
            <div className="example">
              <strong>Example:</strong> {word.example}
            </div>
            {word.synonyms.length > 0 && (
              <div className="synonyms">
                <strong>Synonyms:</strong> {word.synonyms.join(', ')}
              </div>
            )}
            {word.antonyms.length > 0 && (
              <div className="antonyms">
                <strong>Antonyms:</strong> {word.antonyms.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        {!isFlipped ? (
          <div className="front-controls">
            <button 
              className="control-button secondary"
              onClick={() => setShowMeaning(!showMeaning)}
            >
              {showMeaning ? 'Hide Meaning' : 'Show Meaning'}
            </button>
            <button 
              className="control-button primary"
              onClick={handleFlip}
            >
              Flip Card
            </button>
          </div>
        ) : (
          <div className="back-controls">
            <div className="quality-buttons">
              <p className="quality-prompt">How well did you remember this word?</p>
              <div className="quality-grid">
                {qualityButtons.map(({ quality, label, color, description }) => (
                  <button
                    key={quality}
                    className="quality-button"
                    style={{ backgroundColor: color }}
                    onClick={() => handleQualitySelect(quality)}
                    title={description}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="navigation-controls">
        <button 
          className="nav-button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          ← Previous
        </button>
        <button 
          className="nav-button dashboard-button"
          onClick={() => navigate('/')}
        >
          🏠 Dashboard
        </button>
        <button 
          className="nav-button"
          onClick={onNext}
          disabled={!canGoNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
};