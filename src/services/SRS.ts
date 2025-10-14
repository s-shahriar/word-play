import { UserProgress, Quality, SM2Result } from '../types';

export class SM2Algorithm {
  static calculateNextReview(
    userProgress: UserProgress,
    quality: Quality
  ): SM2Result {
    let { easeFactor, repetitions, interval } = userProgress;

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      easeFactor,
      repetitions,
      interval,
      nextReview
    };
  }

  static initializeUserProgress(wordId: string): UserProgress {
    return {
      wordId,
      easeFactor: 2.5,
      repetitions: 0,
      interval: 1,
      nextReview: new Date(),
      totalSeen: 0,
      correctCount: 0,
      accuracy: 0,
      lastReviewed: new Date(),
      masteryLevel: 0
    };
  }

  static updateUserProgress(
    userProgress: UserProgress,
    quality: Quality
  ): UserProgress {
    const sm2Result = this.calculateNextReview(userProgress, quality);
    const totalSeen = userProgress.totalSeen + 1;
    const correctCount = quality >= 3 ? userProgress.correctCount + 1 : userProgress.correctCount;
    const accuracy = correctCount / totalSeen;
    // Use the updated repetitions from sm2Result, not the old one
    const masteryLevel = Math.min(100, Math.round(accuracy * 100 * (1 + sm2Result.repetitions * 0.1)));

    return {
      ...userProgress,
      ...sm2Result,
      totalSeen,
      correctCount,
      accuracy,
      lastReviewed: new Date(),
      masteryLevel
    };
  }

  static getDueWords(allProgress: UserProgress[]): UserProgress[] {
    const now = new Date();
    return allProgress.filter(progress => progress.nextReview <= now);
  }

  static getNewWords(
    allProgress: UserProgress[],
    allWordIds: string[],
    limit: number = 10
  ): string[] {
    const studiedWordIds = new Set(allProgress.map(p => p.wordId));
    const newWordIds = allWordIds.filter(id => !studiedWordIds.has(id));
    return newWordIds.slice(0, limit);
  }
}