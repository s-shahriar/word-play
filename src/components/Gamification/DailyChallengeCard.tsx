import React from 'react';
import { DailyChallenge } from '../../services/GameificationService';
import './DailyChallengeCard.css';

interface DailyChallengeCardProps {
  challenge: DailyChallenge | null;
  onAccept?: () => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  challenge,
  onAccept
}) => {
  if (!challenge) {
    return (
      <div className="daily-challenge-card no-challenge">
        <div className="challenge-icon">📅</div>
        <h3>No Challenge Today</h3>
        <p>Check back tomorrow for a new daily challenge!</p>
      </div>
    );
  }

  const progressPercentage = Math.min((challenge.progress / challenge.target) * 100, 100);

  const getChallengeColor = (type: string): string => {
    switch (type) {
      case 'flashcard': return '#3498db';
      case 'test': return '#9b59b6';
      case 'accuracy': return '#e67e22';
      case 'streak': return '#e74c3c';
      default: return '#34495e';
    }
  };

  return (
    <div className={`daily-challenge-card ${challenge.completed ? 'completed' : ''}`}>
      <div className="challenge-header">
        <div className="challenge-icon" style={{ color: getChallengeColor(challenge.type) }}>
          {challenge.icon}
        </div>
        <div className="challenge-info">
          <h3>{challenge.title}</h3>
          <p>{challenge.description}</p>
        </div>
        <div className="challenge-reward">
          <span className="reward-amount">+{challenge.reward}</span>
          <span className="reward-label">XP</span>
        </div>
      </div>

      <div className="challenge-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: getChallengeColor(challenge.type)
            }}
          />
        </div>
        <div className="progress-text">
          <span className="current">{challenge.progress}</span>
          <span className="separator">/</span>
          <span className="target">{challenge.target}</span>
        </div>
      </div>

      {challenge.completed ? (
        <div className="completed-indicator">
          <span className="completed-icon">✅</span>
          <span className="completed-text">Challenge Complete!</span>
          <span className="completed-reward">+{challenge.reward} XP earned</span>
        </div>
      ) : (
        <div className="challenge-actions">
          {onAccept && (
            <button 
              className="accept-button"
              onClick={onAccept}
              style={{ backgroundColor: getChallengeColor(challenge.type) }}
            >
              Start Challenge
            </button>
          )}
          <div className="challenge-tip">
            {challenge.type === 'flashcard' && "💡 Review flashcards to make progress"}
            {challenge.type === 'test' && "💡 Complete any test to make progress"}
            {challenge.type === 'accuracy' && "💡 Focus on accuracy in your practice"}
            {challenge.type === 'streak' && "💡 Keep your daily learning streak alive"}
          </div>
        </div>
      )}
    </div>
  );
};