import { UserProgress, TestResult, FlashcardSession, TestSession } from '../types';

export class ProgressTracker {
  private static readonly STORAGE_KEYS = {
    USER_PROGRESS: 'wordplay-user-progress',
    TEST_RESULTS: 'wordplay-test-results',
    FLASHCARD_SESSIONS: 'wordplay-flashcard-sessions',
    TEST_SESSIONS: 'wordplay-test-sessions'
  };

  static getUserProgress(): UserProgress[] {
    const data = localStorage.getItem(this.STORAGE_KEYS.USER_PROGRESS);
    return data ? JSON.parse(data).map((p: any) => ({
      ...p,
      nextReview: new Date(p.nextReview),
      lastReviewed: new Date(p.lastReviewed)
    })) : [];
  }

  static saveUserProgress(progress: UserProgress[]): void {
    localStorage.setItem(this.STORAGE_KEYS.USER_PROGRESS, JSON.stringify(progress));
  }

  static getProgressForWord(wordId: string): UserProgress | undefined {
    const allProgress = this.getUserProgress();
    return allProgress.find(p => p.wordId === wordId);
  }

  static updateWordProgress(wordProgress: UserProgress): void {
    const allProgress = this.getUserProgress();
    const existingIndex = allProgress.findIndex(p => p.wordId === wordProgress.wordId);
    
    if (existingIndex >= 0) {
      allProgress[existingIndex] = wordProgress;
    } else {
      allProgress.push(wordProgress);
    }
    
    this.saveUserProgress(allProgress);
  }

  static getTestResults(): TestResult[] {
    const data = localStorage.getItem(this.STORAGE_KEYS.TEST_RESULTS);
    return data ? JSON.parse(data).map((r: any) => ({
      ...r,
      timestamp: new Date(r.timestamp)
    })) : [];
  }

  static saveTestResult(result: TestResult): void {
    const results = this.getTestResults();
    results.push(result);
    localStorage.setItem(this.STORAGE_KEYS.TEST_RESULTS, JSON.stringify(results));
  }

  static getFlashcardSessions(): FlashcardSession[] {
    const data = localStorage.getItem(this.STORAGE_KEYS.FLASHCARD_SESSIONS);
    return data ? JSON.parse(data).map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined
    })) : [];
  }

  static saveFlashcardSession(session: FlashcardSession): void {
    const sessions = this.getFlashcardSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.FLASHCARD_SESSIONS, JSON.stringify(sessions));
  }

  static getTestSessions(): TestSession[] {
    const data = localStorage.getItem(this.STORAGE_KEYS.TEST_SESSIONS);
    return data ? JSON.parse(data).map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined
    })) : [];
  }

  static saveTestSession(session: TestSession): void {
    const sessions = this.getTestSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.TEST_SESSIONS, JSON.stringify(sessions));
  }

  static getWeakWords(limit: number = 10): UserProgress[] {
    const allProgress = this.getUserProgress();
    return allProgress
      .filter(p => p.totalSeen > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit);
  }

  static getOverallStats(): {
    totalWordsStudied: number;
    averageAccuracy: number;
    totalTimeSpent: number;
    currentStreak: number;
    bestStreak: number;
    masteredWords: number;
  } {
    const progress = this.getUserProgress();
    const testResults = this.getTestResults();
    
    const totalWordsStudied = progress.length;
    const averageAccuracy = progress.length > 0 
      ? progress.reduce((sum, p) => sum + p.accuracy, 0) / progress.length 
      : 0;
    
    const totalTimeSpent = testResults.reduce((sum, r) => sum + r.timeSpent, 0);
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const sortedByDate = testResults.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const result of sortedByDate) {
      if (result.correct) {
        tempStreak++;
      } else {
        tempStreak = 0;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    for (let i = sortedByDate.length - 1; i >= 0; i--) {
      if (sortedByDate[i].correct) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    const masteredWords = progress.filter(p => p.masteryLevel >= 80).length;
    
    return {
      totalWordsStudied,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      totalTimeSpent,
      currentStreak,
      bestStreak,
      masteredWords
    };
  }

  static exportData(): string {
    return JSON.stringify({
      userProgress: this.getUserProgress(),
      testResults: this.getTestResults(),
      flashcardSessions: this.getFlashcardSessions(),
      testSessions: this.getTestSessions(),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.userProgress) {
        localStorage.setItem(this.STORAGE_KEYS.USER_PROGRESS, JSON.stringify(data.userProgress));
      }
      
      if (data.testResults) {
        localStorage.setItem(this.STORAGE_KEYS.TEST_RESULTS, JSON.stringify(data.testResults));
      }
      
      if (data.flashcardSessions) {
        localStorage.setItem(this.STORAGE_KEYS.FLASHCARD_SESSIONS, JSON.stringify(data.flashcardSessions));
      }
      
      if (data.testSessions) {
        localStorage.setItem(this.STORAGE_KEYS.TEST_SESSIONS, JSON.stringify(data.testSessions));
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  static clearAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}