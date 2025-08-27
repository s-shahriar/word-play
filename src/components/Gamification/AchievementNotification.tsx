import React, { useState, useEffect } from 'react';
import { Achievement } from '../../services/GameificationService';
import './AchievementNotification.css';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
  experience?: number;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  experience = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        handleClose();
      }, 4000); // Auto close after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [achievement]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade out animation
  };

  if (!achievement) return null;

  return (
    <div className={`achievement-notification ${isVisible ? 'visible' : ''}`}>
      <div className="achievement-content">
        <button className="close-button" onClick={handleClose}>×</button>
        
        <div className="achievement-header">
          <div className="achievement-icon">{achievement.icon}</div>
          <div className="achievement-text">
            <h3>Achievement Unlocked!</h3>
            <h4>{achievement.name}</h4>
          </div>
        </div>
        
        <p className="achievement-description">{achievement.description}</p>
        
        <div className="achievement-rewards">
          <div className="reward-item">
            <span className="reward-icon">🏆</span>
            <span className="reward-text">{achievement.points} Points</span>
          </div>
          {experience > 0 && (
            <div className="reward-item">
              <span className="reward-icon">⭐</span>
              <span className="reward-text">+{experience} XP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};