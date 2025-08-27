import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameificationService } from '../../services/GameificationService';
import './QuickPracticeGrid.css';

interface QuickPracticeGridProps {
  onModeSelect?: (mode: any) => void;
}

export const QuickPracticeGrid: React.FC<QuickPracticeGridProps> = ({
  onModeSelect
}) => {
  const navigate = useNavigate();
  const modes = GameificationService.getQuickPracticeModes();

  const handleModeClick = (mode: any) => {
    if (onModeSelect) {
      onModeSelect(mode);
    } else {
      // Navigate to the appropriate route based on mode type
      if (mode.type === 'flashcard') {
        if (mode.id === 'weak_words') {
          navigate('/flashcards/weak');
        } else {
          navigate('/flashcards/random');
        }
      } else if (mode.type === 'test') {
        navigate('/tests');
      }
    }
  };

  const getModeGradient = (modeId: string): string => {
    switch (modeId) {
      case 'quick_10': return 'linear-gradient(135deg, #3498db, #2980b9)';
      case 'weak_words': return 'linear-gradient(135deg, #e74c3c, #c0392b)';
      case 'random_review': return 'linear-gradient(135deg, #9b59b6, #8e44ad)';
      case 'time_challenge': return 'linear-gradient(135deg, #e67e22, #d35400)';
      case 'streak_builder': return 'linear-gradient(135deg, #f39c12, #e67e22)';
      default: return 'linear-gradient(135deg, #34495e, #2c3e50)';
    }
  };

  return (
    <div className="quick-practice-grid">
      <h2>🚀 Quick Practice Modes</h2>
      <div className="modes-grid">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className="practice-mode-card"
            onClick={() => handleModeClick(mode)}
            style={{ background: getModeGradient(mode.id) }}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div className="mode-content">
              <h3>{mode.name}</h3>
              <p>{mode.description}</p>
              <div className="mode-stats">
                {mode.params.maxCards && (
                  <span className="stat-item">
                    📚 {mode.params.maxCards} cards
                  </span>
                )}
                {mode.params.timeLimit && (
                  <span className="stat-item">
                    ⏱️ {Math.floor(mode.params.timeLimit / 60)}min
                  </span>
                )}
                {mode.params.questionCount && (
                  <span className="stat-item">
                    📝 {mode.params.questionCount} questions
                  </span>
                )}
              </div>
            </div>
            <div className="mode-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
};