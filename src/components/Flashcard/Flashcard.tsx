import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Quality, WordRecord } from "../../types";
import "./Flashcard.css";

interface FlashcardProps {
  word: WordRecord;
  onQualitySelect: (quality: Quality) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentIndex: number;
  totalCount: number;
  showMeaning: boolean;
  setShowMeaning: (show: boolean) => void;
  masteryLevel?: number;
  accuracy?: number;
  repetitions?: number;
  totalSeen?: number;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  onQualitySelect,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentIndex,
  totalCount,
  showMeaning,
  setShowMeaning,
  masteryLevel = 0,
  accuracy = 0,
  repetitions = 0,
  totalSeen = 0,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  // Reset flip state when word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleQualitySelect = (quality: Quality) => {
    onQualitySelect(quality);
    setIsFlipped(false);
  };

  const qualityButtons = [
    {
      quality: 1 as Quality,
      label: "Hard",
      color: "#ff4757",
      description: "Incorrect or didn't remember",
    },
    {
      quality: 3 as Quality,
      label: "Good",
      color: "#ffa502",
      description: "Correct with hesitation",
    },
    {
      quality: 4 as Quality,
      label: "Easy",
      color: "#1e90ff",
      description: "Correct with ease",
    },
    {
      quality: 5 as Quality,
      label: "Perfect",
      color: "#2ed573",
      description: "Perfect response",
    },
  ];

  const getMasteryColor = (level: number) => {
    if (level >= 80) return "#2ed573"; // Green - Excellent
    if (level >= 60) return "#1e90ff"; // Blue - Good
    if (level >= 40) return "#ffa502"; // Orange - Fair
    return "#ff4757"; // Red - Needs practice
  };

  const getMasteryLabel = (level: number, seen: number) => {
    if (level >= 80) return "Mastered";
    if (level >= 60) return "Good";
    if (level >= 40) return "Learning";
    if (seen === 0) return "First Time";
    return "Needs Practice";
  };

  return (
    <div className="flashcard-container">
      <div className="mastery-meter">
        <div className="mastery-info">
          <span className="mastery-label">{getMasteryLabel(masteryLevel, totalSeen)}</span>
          <span className="mastery-stats">
            {totalSeen > 0 ? (
              <>
                {Math.round(accuracy * 100)}% · {totalSeen} {totalSeen === 1 ? "review" : "reviews"}
              </>
            ) : (
              "First time reviewing"
            )}
          </span>
        </div>
        <div className="mastery-bar">
          <div
            className="mastery-fill"
            style={{
              width: `${masteryLevel}%`,
              backgroundColor: getMasteryColor(masteryLevel)
            }}
          />
        </div>
      </div>
      <div className="flashcard-stack">
        <div className={`flashcard ${isFlipped ? "flipped" : ""}`}>
          <div className="flashcard-front">
            <div className="word-display">
              <div className="word-box">
                <h1 className="word">{word.word}</h1>
              </div>
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
                  <strong>Synonyms:</strong> {word.synonyms.join(", ")}
                </div>
              )}
              {word.antonyms.length > 0 && (
                <div className="antonyms">
                  <strong>Antonyms:</strong> {word.antonyms.join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        {!isFlipped ? (
          <div className="front-controls">
            <button
              className="control-button show-meaning-button"
              onClick={() => setShowMeaning(!showMeaning)}
            >
              {showMeaning ? "Hide Meaning" : "Show Meaning"}
            </button>
            <button
              className="control-button flip-card-button"
              onClick={handleFlip}
            >
              Flip Card
            </button>
          </div>
        ) : (
          <div className="back-controls">
            <button
              className="control-button flip-card-button"
              onClick={handleFlip}
            >
              Flip Back
            </button>
            <div className="quality-buttons">
              <p className="quality-prompt">
                How well did you remember this word?
              </p>
              <div className="quality-grid">
                {qualityButtons.map(
                  ({ quality, label, color, description }) => (
                    <button
                      key={quality}
                      className="quality-button"
                      style={{ backgroundColor: color }}
                      onClick={() => handleQualitySelect(quality)}
                      title={description}
                    >
                      {label}
                    </button>
                  )
                )}
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
          ◀
        </button>
        <button
          className="nav-button home-button"
          onClick={() => navigate("/")}
        >
          🏠
        </button>
        <button className="nav-button" onClick={onNext} disabled={!canGoNext}>
          ▶
        </button>
      </div>
    </div>
  );
};
