import React from 'react';
import { StreakData } from '../../services/GameificationService';
import './StreakIndicator.css';

interface StreakIndicatorProps {
  streak: StreakData;
  size?: 'small' | 'medium' | 'large';
  showFreezes?: boolean;
  onFreezeStreak?: () => void;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  streak,
  size = 'medium',
  showFreezes = false,
  onFreezeStreak
}) => {
  const getStreakColor = (current: number): string => {
    if (current >= 30) return '#e74c3c'; // Red hot
    if (current >= 14) return '#e67e22'; // Orange
    if (current >= 7) return '#f39c12';  // Yellow
    if (current >= 3) return '#3498db';  // Blue
    return '#95a5a6'; // Gray
  };

  const getStreakEmoji = (current: number): string => {
    if (current >= 100) return '🔥🔥🔥';
    if (current >= 30) return '🔥🔥';
    if (current >= 7) return '🔥';
    if (current >= 3) return '🔥';
    if (current >= 1) return '✨';
    return '💤';
  };

  const getStreakTitle = (current: number): string => {
    if (current >= 100) return 'Legendary Streak!';
    if (current >= 30) return 'Amazing Streak!';
    if (current >= 14) return 'Great Streak!';
    if (current >= 7) return 'Good Streak!';
    if (current >= 3) return 'Building Momentum';
    if (current >= 1) return 'Getting Started';
    return 'Start Your Journey';
  };

  const canFreeze = streak.freezesUsed < streak.maxFreezes && !streak.frozen && streak.current > 0;

  return (
    <div className={`streak-indicator ${size} ${streak.frozen ? 'frozen' : ''}`}>
      <div className="streak-content">
        <div 
          className="streak-flame"
          style={{ color: getStreakColor(streak.current) }}
        >
          {getStreakEmoji(streak.current)}
        </div>
        
        <div className="streak-info">
          <div className="streak-number" style={{ color: getStreakColor(streak.current) }}>
            {streak.current}
          </div>
          <div className="streak-label">
            {streak.current === 1 ? 'Day' : 'Days'}
          </div>
        </div>
        
        {streak.frozen && (
          <div className="freeze-indicator" title="Streak is frozen">
            ❄️
          </div>
        )}
      </div>
      
      <div className="streak-title">
        {getStreakTitle(streak.current)}
      </div>
      
      {streak.best > streak.current && (
        <div className="best-streak">
          Best: {streak.best} days 🏆
        </div>
      )}
      
      {showFreezes && (
        <div className="freeze-section">
          <div className="freeze-info">
            <span className="freeze-icon">❄️</span>
            <span className="freeze-text">
              Streak Freezes: {streak.maxFreezes - streak.freezesUsed} left
            </span>
          </div>
          
          {canFreeze && onFreezeStreak && (
            <button 
              className="freeze-button"
              onClick={onFreezeStreak}
              title="Use a streak freeze to protect your streak for one day"
            >
              🛡️ Freeze Streak
            </button>
          )}
          
          {streak.frozen && (
            <div className="frozen-message">
              <span className="freeze-icon">❄️</span>
              Your streak is protected today!
            </div>
          )}
        </div>
      )}
    </div>
  );
};