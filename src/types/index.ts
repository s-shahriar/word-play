export interface WordRecord {
  word: string;
  meaning: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
}

export interface UserProgress {
  wordId: string;
  easeFactor: number;
  repetitions: number;
  interval: number;
  nextReview: Date;
  totalSeen: number;
  correctCount: number;
  accuracy: number;
  lastReviewed: Date;
  masteryLevel: number;
  lastModified?: Date; // Track when this record was last modified
  syncVersion?: number; // Version number for conflict resolution
}

export interface TestResult {
  testType: "flashcard" | "match" | "sentence" | "synonym-antonym";
  wordId: string;
  correct: boolean;
  timeSpent: number;
  timestamp: Date;
  quality: number;
}

export interface MatchTestResult {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface MatchTestSession {
  questions: any[];
  results: MatchTestResult[];
  startTime: Date;
  endTime?: Date;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  averageTime: number;
  timeBonus: number;
}

export interface FlashcardSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  averageTime: number;
}

export interface TestSession {
  id: string;
  testType: TestResult["testType"];
  startTime: Date;
  endTime?: Date;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2Result {
  easeFactor: number;
  repetitions: number;
  interval: number;
  nextReview: Date;
}

export interface SyncMetadata {
  lastSyncTime: Date | null;
  dataChecksum: string;
  recordCount: number;
  deviceId: string;
  syncVersion: number;
}

export interface SyncConflict {
  wordId: string;
  localData: UserProgress;
  remoteData: UserProgress;
  conflictType: 'both-modified' | 'version-mismatch';
}