import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../data/DataManager';
import './AlphabetBrowser.css';

export const AlphabetBrowser: React.FC = () => {
  const navigate = useNavigate();
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLetterCounts();
  }, []);

  const loadLetterCounts = async () => {
    try {
      const words = await DataManager.loadWords();
      const counts: Record<string, number> = {};

      // Initialize all letters to 0
      for (let i = 65; i <= 90; i++) {
        counts[String.fromCharCode(i)] = 0;
      }

      // Count words for each letter
      words.forEach((word) => {
        const firstLetter = word.word.charAt(0).toUpperCase();
        if (firstLetter >= 'A' && firstLetter <= 'Z') {
          counts[firstLetter]++;
        }
      });

      setLetterCounts(counts);
    } catch (error) {
      console.error('Error loading letter counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLetterClick = (letter: string) => {
    if (letterCounts[letter] > 0) {
      navigate(`/browse/${letter}`);
    }
  };

  if (loading) {
    return (
      <div className="alphabet-browser-loading">
        <div className="loading-spinner"></div>
        <p>Loading vocabulary...</p>
      </div>
    );
  }

  const letters = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <div className="alphabet-browser">
      <div className="alphabet-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>
          <span className="icon">📚</span>
          Browse by Letter
        </h1>
        <p className="subtitle">
          Explore vocabulary alphabetically
        </p>
      </div>

      <div className="alphabet-grid">
        {letters.map((letter) => {
          const count = letterCounts[letter] || 0;
          const isEmpty = count === 0;

          return (
            <button
              key={letter}
              className={`letter-card ${isEmpty ? 'empty' : ''}`}
              onClick={() => handleLetterClick(letter)}
              disabled={isEmpty}
            >
              <div className="letter-display">{letter}</div>
              <div className="word-count">
                {isEmpty ? 'No words' : `${count} word${count !== 1 ? 's' : ''}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
