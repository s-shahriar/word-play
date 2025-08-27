import { ProgressTracker } from './ProgressTracker';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'accuracy' | 'time' | 'mastery' | 'tests' | 'special';
  requirement: number;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface StreakData {
  current: number;
  best: number;
  lastActivity: Date;
  frozen: boolean;
  freezesUsed: number;
  maxFreezes: number;
}

export interface MasteryLevel {
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  color: string;
  minAccuracy: number;
  minReviews: number;
}

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'flashcard' | 'test' | 'streak' | 'accuracy';
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
  icon: string;
}

export interface UserStats {
  level: number;
  experience: number;
  experienceToNext: number;
  totalPoints: number;
  achievements: Achievement[];
  streak: StreakData;
  dailyChallenge: DailyChallenge | null;
}

export class GameificationService {
  private static readonly STORAGE_KEYS = {
    ACHIEVEMENTS: 'wordplay-achievements',
    STREAK_DATA: 'wordplay-streak-data',
    DAILY_CHALLENGE: 'wordplay-daily-challenge',
    USER_LEVEL: 'wordplay-user-level',
    USER_EXPERIENCE: 'wordplay-user-experience'
  };

  private static readonly ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
    // Streak achievements
    { id: 'streak_3', name: 'Getting Started', description: '3 day learning streak', icon: '🔥', type: 'streak', requirement: 3, points: 50 },
    { id: 'streak_7', name: 'Week Warrior', description: '7 day learning streak', icon: '🔥', type: 'streak', requirement: 7, points: 100 },
    { id: 'streak_14', name: 'Two Week Champion', description: '14 day learning streak', icon: '🔥', type: 'streak', requirement: 14, points: 200 },
    { id: 'streak_30', name: 'Month Master', description: '30 day learning streak', icon: '🔥', type: 'streak', requirement: 30, points: 500 },
    { id: 'streak_100', name: 'Century Streak', description: '100 day learning streak', icon: '🏆', type: 'streak', requirement: 100, points: 1000 },

    // Accuracy achievements
    { id: 'accuracy_80', name: 'Sharp Shooter', description: 'Maintain 80% accuracy', icon: '🎯', type: 'accuracy', requirement: 80, points: 100 },
    { id: 'accuracy_90', name: 'Precision Master', description: 'Maintain 90% accuracy', icon: '🎯', type: 'accuracy', requirement: 90, points: 250 },
    { id: 'accuracy_95', name: 'Perfect Aim', description: 'Maintain 95% accuracy', icon: '🎯', type: 'accuracy', requirement: 95, points: 500 },

    // Test achievements
    { id: 'tests_10', name: 'Test Taker', description: 'Complete 10 tests', icon: '📝', type: 'tests', requirement: 10, points: 75 },
    { id: 'tests_50', name: 'Test Master', description: 'Complete 50 tests', icon: '📝', type: 'tests', requirement: 50, points: 200 },
    { id: 'tests_100', name: 'Test Champion', description: 'Complete 100 tests', icon: '🏆', type: 'tests', requirement: 100, points: 400 },

    // Mastery achievements
    { id: 'mastery_10', name: 'Word Explorer', description: 'Master 10 words', icon: '📚', type: 'mastery', requirement: 10, points: 100 },
    { id: 'mastery_50', name: 'Vocabulary Builder', description: 'Master 50 words', icon: '📚', type: 'mastery', requirement: 50, points: 300 },
    { id: 'mastery_100', name: 'Word Wizard', description: 'Master 100 words', icon: '🧙', type: 'mastery', requirement: 100, points: 600 },
    { id: 'mastery_250', name: 'Vocabulary Sage', description: 'Master 250 words', icon: '🧙', type: 'mastery', requirement: 250, points: 1200 },

    // Time achievements
    { id: 'time_1h', name: 'Dedicated Learner', description: 'Spend 1 hour learning', icon: '⏱️', type: 'time', requirement: 3600000, points: 100 },
    { id: 'time_10h', name: 'Committed Student', description: 'Spend 10 hours learning', icon: '⏱️', type: 'time', requirement: 36000000, points: 300 },
    { id: 'time_50h', name: 'Learning Legend', description: 'Spend 50 hours learning', icon: '👑', type: 'time', requirement: 180000000, points: 1000 },

    // Special achievements
    { id: 'perfect_test', name: 'Perfectionist', description: 'Score 100% on a test', icon: '⭐', type: 'special', requirement: 100, points: 150 },
    { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a test in under 60 seconds', icon: '⚡', type: 'special', requirement: 60000, points: 200 },
    { id: 'comeback_kid', name: 'Comeback Kid', description: 'Return after 7+ day break', icon: '💪', type: 'special', requirement: 7, points: 100 }
  ];

  private static readonly MASTERY_LEVELS: MasteryLevel[] = [
    { level: 'bronze', name: 'Bronze', color: '#CD7F32', minAccuracy: 60, minReviews: 3 },
    { level: 'silver', name: 'Silver', color: '#C0C0C0', minAccuracy: 70, minReviews: 5 },
    { level: 'gold', name: 'Gold', color: '#FFD700', minAccuracy: 80, minReviews: 8 },
    { level: 'platinum', name: 'Platinum', color: '#E5E4E2', minAccuracy: 90, minReviews: 12 },
    { level: 'diamond', name: 'Diamond', color: '#B9F2FF', minAccuracy: 95, minReviews: 15 }
  ];

  static getUserStats(): UserStats {
    const achievements = this.getAchievements();
    const streak = this.getStreakData();
    const level = this.getUserLevel();
    const experience = this.getUserExperience();
    const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
    
    return {
      level,
      experience,
      experienceToNext: this.getExperienceToNextLevel(level),
      totalPoints,
      achievements,
      streak,
      dailyChallenge: this.getDailyChallenge()
    };
  }

  static getAchievements(): Achievement[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS);
    const unlockedAchievements = stored ? JSON.parse(stored) : {};
    
    return this.ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      unlocked: !!unlockedAchievements[achievement.id],
      unlockedAt: unlockedAchievements[achievement.id] ? new Date(unlockedAchievements[achievement.id]) : undefined
    }));
  }

  static checkAndUnlockAchievements(): Achievement[] {
    const currentAchievements = this.getAchievements();
    const stats = ProgressTracker.getOverallStats();
    const testResults = ProgressTracker.getTestResults();
    const newlyUnlocked: Achievement[] = [];

    const stored = localStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS);
    const unlockedAchievements = stored ? JSON.parse(stored) : {};

    currentAchievements.forEach(achievement => {
      if (achievement.unlocked) return;

      let shouldUnlock = false;

      switch (achievement.type) {
        case 'streak':
          shouldUnlock = stats.currentStreak >= achievement.requirement;
          break;
        case 'accuracy':
          shouldUnlock = (stats.averageAccuracy * 100) >= achievement.requirement;
          break;
        case 'tests':
          shouldUnlock = testResults.length >= achievement.requirement;
          break;
        case 'mastery':
          shouldUnlock = stats.masteredWords >= achievement.requirement;
          break;
        case 'time':
          shouldUnlock = stats.totalTimeSpent >= achievement.requirement;
          break;
        case 'special':
          if (achievement.id === 'perfect_test') {
            shouldUnlock = testResults.some(r => r.correct && (r as any).score === 100);
          } else if (achievement.id === 'speed_demon') {
            shouldUnlock = testResults.some(r => r.timeSpent <= achievement.requirement);
          } else if (achievement.id === 'comeback_kid') {
            const lastActivity = testResults[testResults.length - 1]?.timestamp;
            const now = new Date();
            if (lastActivity) {
              const daysDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
              shouldUnlock = daysDiff >= achievement.requirement && testResults.length > 5;
            }
          }
          break;
      }

      if (shouldUnlock) {
        unlockedAchievements[achievement.id] = new Date().toISOString();
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        newlyUnlocked.push(achievement);
        this.addExperience(achievement.points);
      }
    });

    if (newlyUnlocked.length > 0) {
      localStorage.setItem(this.STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlockedAchievements));
    }

    return newlyUnlocked;
  }

  static getStreakData(): StreakData {
    const stored = localStorage.getItem(this.STORAGE_KEYS.STREAK_DATA);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        ...data,
        lastActivity: new Date(data.lastActivity)
      };
    }

    return {
      current: 0,
      best: 0,
      lastActivity: new Date(),
      frozen: false,
      freezesUsed: 0,
      maxFreezes: 3
    };
  }

  static updateStreak(activity: boolean = true): StreakData {
    const streak = this.getStreakData();
    const now = new Date();
    const lastActivity = streak.lastActivity;
    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (activity) {
      if (daysDiff === 0) {
        // Same day activity, no change to streak
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        streak.current++;
        streak.best = Math.max(streak.best, streak.current);
        streak.frozen = false;
      } else if (daysDiff > 1 && streak.frozen && streak.freezesUsed < streak.maxFreezes) {
        // Streak was frozen, use a freeze
        streak.freezesUsed++;
        streak.frozen = false;
      } else {
        // Streak broken
        streak.current = 1;
        streak.freezesUsed = 0;
        streak.frozen = false;
      }
      streak.lastActivity = now;
    }

    this.saveStreakData(streak);
    return streak;
  }

  static freezeStreak(): boolean {
    const streak = this.getStreakData();
    if (streak.freezesUsed < streak.maxFreezes) {
      streak.frozen = true;
      this.saveStreakData(streak);
      return true;
    }
    return false;
  }

  private static saveStreakData(streak: StreakData): void {
    localStorage.setItem(this.STORAGE_KEYS.STREAK_DATA, JSON.stringify(streak));
  }

  static getWordMasteryLevel(accuracy: number, totalSeen: number): MasteryLevel {
    const accuracyPercent = accuracy * 100;
    
    for (let i = this.MASTERY_LEVELS.length - 1; i >= 0; i--) {
      const level = this.MASTERY_LEVELS[i];
      if (accuracyPercent >= level.minAccuracy && totalSeen >= level.minReviews) {
        return level;
      }
    }
    
    return this.MASTERY_LEVELS[0]; // Default to bronze
  }

  static getDailyChallenge(): DailyChallenge | null {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(this.STORAGE_KEYS.DAILY_CHALLENGE);
    
    if (stored) {
      const challenge = JSON.parse(stored);
      if (challenge.date === today) {
        return challenge;
      }
    }

    // Generate new daily challenge
    return this.generateDailyChallenge(today);
  }

  private static generateDailyChallenge(date: string): DailyChallenge {
    const challenges = [
      { type: 'flashcard', title: 'Flash Forward', description: 'Review 20 flashcards', target: 20, reward: 100, icon: '🎴' },
      { type: 'test', title: 'Test Yourself', description: 'Complete 3 tests', target: 3, reward: 150, icon: '📝' },
      { type: 'accuracy', title: 'Precision Practice', description: 'Achieve 85% accuracy today', target: 85, reward: 200, icon: '🎯' },
      { type: 'streak', title: 'Keep It Going', description: 'Maintain your learning streak', target: 1, reward: 50, icon: '🔥' }
    ];

    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    const challenge: DailyChallenge = {
      id: `daily-${date}`,
      date,
      title: randomChallenge.title,
      description: randomChallenge.description,
      type: randomChallenge.type as any,
      target: randomChallenge.target,
      progress: 0,
      completed: false,
      reward: randomChallenge.reward,
      icon: randomChallenge.icon
    };

    localStorage.setItem(this.STORAGE_KEYS.DAILY_CHALLENGE, JSON.stringify(challenge));
    return challenge;
  }

  static updateDailyChallengeProgress(type: string, amount: number = 1): DailyChallenge | null {
    const challenge = this.getDailyChallenge();
    if (!challenge || challenge.completed || challenge.type !== type) {
      return challenge;
    }

    if (type === 'accuracy') {
      // For accuracy, we need to calculate the current day's accuracy
      const stats = ProgressTracker.getOverallStats();
      challenge.progress = Math.round(stats.averageAccuracy * 100);
    } else {
      challenge.progress += amount;
    }

    if (challenge.progress >= challenge.target) {
      challenge.completed = true;
      challenge.progress = challenge.target;
      this.addExperience(challenge.reward);
    }

    localStorage.setItem(this.STORAGE_KEYS.DAILY_CHALLENGE, JSON.stringify(challenge));
    return challenge;
  }

  static getUserLevel(): number {
    const stored = localStorage.getItem(this.STORAGE_KEYS.USER_LEVEL);
    return stored ? parseInt(stored, 10) : 1;
  }

  static getUserExperience(): number {
    const stored = localStorage.getItem(this.STORAGE_KEYS.USER_EXPERIENCE);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addExperience(amount: number): { levelUp: boolean; newLevel: number } {
    const currentExp = this.getUserExperience();
    const currentLevel = this.getUserLevel();
    const newExp = currentExp + amount;
    
    localStorage.setItem(this.STORAGE_KEYS.USER_EXPERIENCE, newExp.toString());

    // Check for level up
    const newLevel = this.calculateLevel(newExp);
    const levelUp = newLevel > currentLevel;

    if (levelUp) {
      localStorage.setItem(this.STORAGE_KEYS.USER_LEVEL, newLevel.toString());
    }

    return { levelUp, newLevel };
  }

  private static calculateLevel(experience: number): number {
    // Level formula: level = floor(sqrt(exp / 100)) + 1
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  private static getExperienceToNextLevel(currentLevel: number): number {
    // Experience needed for next level: (level^2) * 100
    const expForNextLevel = (currentLevel * currentLevel) * 100;
    const currentExp = this.getUserExperience();
    return Math.max(0, expForNextLevel - currentExp);
  }

  static getQuickPracticeModes() {
    return [
      {
        id: 'quick_10',
        name: '10 Quick Cards',
        description: 'Rapid flashcard session',
        icon: '⚡',
        type: 'flashcard',
        params: { maxCards: 10, timeLimit: 300 } // 5 minutes
      },
      {
        id: 'weak_words',
        name: 'Weak Words Focus',
        description: 'Practice your challenging words',
        icon: '📚',
        type: 'flashcard',
        params: { sessionType: 'weak', maxCards: 15 }
      },
      {
        id: 'random_review',
        name: 'Random Review',
        description: 'Surprise word selection',
        icon: '🎲',
        type: 'flashcard',
        params: { sessionType: 'random', maxCards: 20 }
      },
      {
        id: 'time_challenge',
        name: 'Time Challenge',
        description: 'Beat the clock in tests',
        icon: '⏰',
        type: 'test',
        params: { timeLimit: 120, questionCount: 10 }
      },
      {
        id: 'streak_builder',
        name: 'Streak Builder',
        description: 'Build consecutive correct answers',
        icon: '🔥',
        type: 'flashcard',
        params: { streakMode: true, maxCards: 25 }
      }
    ];
  }

  static clearAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}