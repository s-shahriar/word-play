import { WordRecord } from '../types';
import { fuzzyMatchScore, generateSimilarWords } from '../utils/fuzzyMatch';

export interface MatchQuestion {
  id: string;
  word: string;
  correctAnswer: string;
  choices: string[];
  wordRecord: WordRecord;
}

export interface TestResult {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TestSession {
  questions: MatchQuestion[];
  results: TestResult[];
  startTime: Date;
  endTime?: Date;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  averageTime: number;
  timeBonus: number;
}

export interface SentenceQuestion {
  id: string;
  originalSentence: string;
  sentenceWithBlank: string;
  correctAnswer: string;
  choices?: string[];
  wordRecord: WordRecord;
  blankPosition: number;
}

export interface SentenceTestResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  score: number; // 1.0, 0.5, 0.3, or 0
  matchType: 'exact' | 'fuzzy' | 'partial' | 'wrong';
  timeSpent: number;
}

export interface SynonymAntonymQuestion {
  id: string;
  word: string;
  meaning: string;
  correctSynonyms: string[];
  correctAntonyms: string[];
  synonymChoices: string[];
  antonymChoices: string[];
  wordRecord: WordRecord;
}

export interface SynonymAntonymTestResult {
  questionId: string;
  selectedSynonyms: string[];
  selectedAntonyms: string[];
  correctSynonyms: string[];
  correctAntonyms: string[];
  synonymScore: number; // correctSelected / totalCorrect
  antonymScore: number; // correctSelected / totalCorrect
  overallScore: number; // (synonymScore + antonymScore) / 2
  timeSpent: number;
}

export class TestGenerator {
  static generateMatchQuestion(
    targetWord: WordRecord, 
    allWords: WordRecord[],
    choicesCount: number = 4
  ): MatchQuestion {
    const correct = targetWord.meaning;
    
    // Create a pool of potential distractors
    const pool = new Set<string>();
    
    // Add meanings from other words
    allWords.forEach(word => {
      if (word.meaning && word.meaning !== correct) {
        pool.add(word.meaning);
      }
    });
    
    // Add meanings from synonyms and antonyms of other words for variety
    allWords.forEach(word => {
      if (word.word !== targetWord.word) {
        // Sometimes include related meanings to make it more challenging
        const relatedWords = [...word.synonyms, ...word.antonyms];
        relatedWords.forEach(relatedWord => {
          const relatedMeaning = allWords.find(w => 
            w.word.toLowerCase() === relatedWord.toLowerCase()
          )?.meaning;
          if (relatedMeaning && relatedMeaning !== correct) {
            pool.add(relatedMeaning);
          }
        });
      }
    });
    
    // Convert to array and shuffle
    const poolArray = Array.from(pool);
    const shuffled = poolArray.sort(() => Math.random() - 0.5);
    
    // Take the first (choicesCount - 1) as distractors
    const distractors = shuffled.slice(0, choicesCount - 1);
    
    // If we don't have enough distractors, fill with random meanings
    while (distractors.length < choicesCount - 1) {
      const randomMeaning = poolArray[Math.floor(Math.random() * poolArray.length)];
      if (!distractors.includes(randomMeaning)) {
        distractors.push(randomMeaning);
      }
    }
    
    // Combine correct answer with distractors and shuffle
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    
    return {
      id: `match-${targetWord.word}-${Date.now()}`,
      word: targetWord.word,
      correctAnswer: correct,
      choices,
      wordRecord: targetWord
    };
  }

  static generateMatchTest(
    words: WordRecord[],
    questionCount: number = 10
  ): MatchQuestion[] {
    if (words.length < questionCount) {
      throw new Error(`Not enough words available. Need ${questionCount}, have ${words.length}`);
    }
    
    // Select random words for the test
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, questionCount);
    
    // Generate questions
    return selectedWords.map(word => 
      this.generateMatchQuestion(word, words)
    );
  }

  static calculateScore(
    results: TestResult[],
    totalTime: number,
    timeLimit?: number
  ): {
    score: number;
    correctAnswers: number;
    accuracy: number;
    averageTime: number;
    timeBonus: number;
  } {
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const accuracy = correctAnswers / results.length;
    const averageTime = totalTime / results.length / 1000; // in seconds
    
    // Base score: 1 point per correct answer
    let score = correctAnswers;
    
    // Time bonus calculation (optional)
    let timeBonus = 0;
    if (timeLimit) {
      const timeEfficiency = Math.max(0, (timeLimit - totalTime) / timeLimit);
      timeBonus = Math.round(correctAnswers * timeEfficiency * 0.5); // Up to 50% bonus
      score += timeBonus;
    }
    
    return {
      score,
      correctAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      averageTime: Math.round(averageTime * 10) / 10,
      timeBonus
    };
  }

  static getDifficultyLevel(accuracy: number, averageTime: number): {
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    description: string;
    nextRecommendation: string;
  } {
    if (accuracy >= 0.9 && averageTime <= 3) {
      return {
        level: 'expert',
        description: 'Excellent! You\'re mastering these words.',
        nextRecommendation: 'Try advanced tests or learn new words.'
      };
    } else if (accuracy >= 0.8 && averageTime <= 5) {
      return {
        level: 'advanced',
        description: 'Great job! You have strong vocabulary knowledge.',
        nextRecommendation: 'Challenge yourself with faster rounds.'
      };
    } else if (accuracy >= 0.6 && averageTime <= 8) {
      return {
        level: 'intermediate',
        description: 'Good progress! Keep practicing to improve.',
        nextRecommendation: 'Focus on weak words and practice regularly.'
      };
    } else {
      return {
        level: 'beginner',
        description: 'Good start! Practice will help you improve.',
        nextRecommendation: 'Use flashcards to learn words before testing.'
      };
    }
  }

  // Utility method from the original plan example
  static makeMatchQuestion(targetWord: WordRecord, allWords: WordRecord[], choicesCount: number = 4): MatchQuestion {
    return this.generateMatchQuestion(targetWord, allWords, choicesCount);
  }

  // SENTENCE TEST METHODS

  static generateSentenceQuestion(
    targetWord: WordRecord,
    allWords: WordRecord[],
    includeChoices: boolean = true
  ): SentenceQuestion {
    const sentence = targetWord.example;
    const word = targetWord.word;
    
    // Find the word in the sentence (case-insensitive)
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    const match = sentence.match(wordRegex);
    
    if (!match) {
      // If exact word not found, try to find it with different cases
      const words = sentence.split(/\s+/);
      let blankPosition = -1;
      let actualWord = word;
      
      for (let i = 0; i < words.length; i++) {
        const cleanWord = words[i].replace(/[^\w]/g, '').toLowerCase();
        if (cleanWord === word.toLowerCase()) {
          blankPosition = i;
          actualWord = words[i].replace(/[^\w]/g, '');
          break;
        }
      }
      
      if (blankPosition === -1) {
        // Fallback: create a simple sentence
        const sentenceWithBlank = `Fill in the blank: The meaning of _____ is "${targetWord.meaning}".`;
        return {
          id: `sentence-${targetWord.word}-${Date.now()}`,
          originalSentence: sentence,
          sentenceWithBlank,
          correctAnswer: word,
          choices: includeChoices ? this.generateSentenceChoices(word, allWords) : undefined,
          wordRecord: targetWord,
          blankPosition: 5
        };
      }
    }
    
    // Replace the word with blank
    const sentenceWithBlank = sentence.replace(wordRegex, '_____');
    const blankPosition = sentence.toLowerCase().indexOf(word.toLowerCase());
    
    return {
      id: `sentence-${targetWord.word}-${Date.now()}`,
      originalSentence: sentence,
      sentenceWithBlank,
      correctAnswer: word,
      choices: includeChoices ? this.generateSentenceChoices(word, allWords) : undefined,
      wordRecord: targetWord,
      blankPosition
    };
  }

  static generateSentenceChoices(targetWord: string, allWords: WordRecord[], choicesCount: number = 4): string[] {
    const allWordsList = allWords.map(w => w.word);
    const similar = generateSimilarWords(targetWord, allWordsList);
    
    // Take first 3 similar words as distractors
    const distractors = similar.slice(0, choicesCount - 1);
    
    // If we don't have enough similar words, add random words
    while (distractors.length < choicesCount - 1) {
      const randomWord = allWordsList[Math.floor(Math.random() * allWordsList.length)];
      if (randomWord !== targetWord && !distractors.includes(randomWord)) {
        distractors.push(randomWord);
      }
    }
    
    // Combine and shuffle
    const choices = [targetWord, ...distractors].sort(() => Math.random() - 0.5);
    return choices;
  }

  static generateSentenceTest(
    words: WordRecord[],
    questionCount: number = 10,
    includeChoices: boolean = true
  ): SentenceQuestion[] {
    if (words.length < questionCount) {
      throw new Error(`Not enough words available. Need ${questionCount}, have ${words.length}`);
    }
    
    // Filter words that have example sentences
    const wordsWithExamples = words.filter(word => 
      word.example && word.example.trim().length > 0
    );
    
    if (wordsWithExamples.length < questionCount) {
      throw new Error(`Not enough words with example sentences. Need ${questionCount}, have ${wordsWithExamples.length}`);
    }
    
    // Select random words for the test
    const shuffled = [...wordsWithExamples].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, questionCount);
    
    // Generate questions
    return selectedWords.map(word => 
      this.generateSentenceQuestion(word, words, includeChoices)
    );
  }

  static evaluateSentenceAnswer(userAnswer: string, correctAnswer: string): {
    score: number;
    matchType: 'exact' | 'fuzzy' | 'partial' | 'wrong';
    feedback: string;
  } {
    const score = fuzzyMatchScore(userAnswer, correctAnswer);
    let matchType: 'exact' | 'fuzzy' | 'partial' | 'wrong';
    let feedback: string;
    
    if (score === 1.0) {
      matchType = 'exact';
      feedback = '✅ Perfect! Exact match.';
    } else if (score === 0.5) {
      matchType = 'fuzzy';
      feedback = '🟡 Close enough! Minor spelling difference.';
    } else if (score === 0.3) {
      matchType = 'partial';
      feedback = '🟠 Partially correct, but not quite right.';
    } else {
      matchType = 'wrong';
      feedback = `❌ Incorrect. The correct answer is "${correctAnswer}".`;
    }
    
    return { score, matchType, feedback };
  }

  static calculateSentenceTestScore(
    results: SentenceTestResult[],
    totalTime: number
  ): {
    totalScore: number;
    maxScore: number;
    percentage: number;
    exactMatches: number;
    fuzzyMatches: number;
    partialMatches: number;
    wrongAnswers: number;
    averageTime: number;
  } {
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxScore = results.length;
    const percentage = (totalScore / maxScore) * 100;
    
    const exactMatches = results.filter(r => r.matchType === 'exact').length;
    const fuzzyMatches = results.filter(r => r.matchType === 'fuzzy').length;
    const partialMatches = results.filter(r => r.matchType === 'partial').length;
    const wrongAnswers = results.filter(r => r.matchType === 'wrong').length;
    
    const averageTime = totalTime / results.length / 1000; // in seconds
    
    return {
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore,
      percentage: Math.round(percentage),
      exactMatches,
      fuzzyMatches,
      partialMatches,
      wrongAnswers,
      averageTime: Math.round(averageTime * 10) / 10
    };
  }

  // SYNONYM/ANTONYM TEST METHODS

  static generateSynonymAntonymQuestion(
    targetWord: WordRecord,
    allWords: WordRecord[],
    choicesCount: number = 6
  ): SynonymAntonymQuestion {
    const correctSynonyms = targetWord.synonyms;
    const correctAntonyms = targetWord.antonyms;
    
    // Collect all available synonyms and antonyms from other words
    const allSynonyms = new Set<string>();
    const allAntonyms = new Set<string>();
    
    allWords.forEach(word => {
      if (word.word !== targetWord.word) {
        word.synonyms.forEach(syn => allSynonyms.add(syn));
        word.antonyms.forEach(ant => allAntonyms.add(ant));
      }
    });

    // Generate synonym choices (correct + distractors)
    const synonymDistractors = Array.from(allSynonyms)
      .filter(syn => !correctSynonyms.includes(syn))
      .sort(() => Math.random() - 0.5)
      .slice(0, choicesCount - correctSynonyms.length);
    
    const synonymChoices = [...correctSynonyms, ...synonymDistractors]
      .sort(() => Math.random() - 0.5);

    // Generate antonym choices (correct + distractors)  
    const antonymDistractors = Array.from(allAntonyms)
      .filter(ant => !correctAntonyms.includes(ant))
      .sort(() => Math.random() - 0.5)
      .slice(0, choicesCount - correctAntonyms.length);
    
    const antonymChoices = [...correctAntonyms, ...antonymDistractors]
      .sort(() => Math.random() - 0.5);

    return {
      id: `synonym-antonym-${targetWord.word}-${Date.now()}`,
      word: targetWord.word,
      meaning: targetWord.meaning,
      correctSynonyms,
      correctAntonyms,
      synonymChoices: synonymChoices.slice(0, choicesCount),
      antonymChoices: antonymChoices.slice(0, choicesCount),
      wordRecord: targetWord
    };
  }

  static generateSynonymAntonymTest(
    words: WordRecord[],
    questionCount: number = 10,
    choicesCount: number = 6
  ): SynonymAntonymQuestion[] {
    // Filter words that have both synonyms and antonyms
    const wordsWithSynAnt = words.filter(word => 
      word.synonyms.length > 0 && word.antonyms.length > 0
    );
    
    if (wordsWithSynAnt.length < questionCount) {
      throw new Error(`Not enough words with synonyms and antonyms. Need ${questionCount}, have ${wordsWithSynAnt.length}`);
    }
    
    // Select random words for the test
    const shuffled = [...wordsWithSynAnt].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, questionCount);
    
    // Generate questions
    return selectedWords.map(word => 
      this.generateSynonymAntonymQuestion(word, words, choicesCount)
    );
  }

  static evaluateSynonymAntonymAnswer(
    selectedSynonyms: string[],
    selectedAntonyms: string[],
    correctSynonyms: string[],
    correctAntonyms: string[]
  ): {
    synonymScore: number;
    antonymScore: number;
    overallScore: number;
    synonymFeedback: string;
    antonymFeedback: string;
    overallFeedback: string;
  } {
    // Calculate synonym score
    const correctSynonymSelections = selectedSynonyms.filter(syn => 
      correctSynonyms.includes(syn)
    ).length;
    const incorrectSynonymSelections = selectedSynonyms.filter(syn => 
      !correctSynonyms.includes(syn)
    ).length;
    const missedSynonyms = correctSynonyms.filter(syn => 
      !selectedSynonyms.includes(syn)
    ).length;
    
    // Synonym score: (correct - incorrect) / total possible, minimum 0
    const synonymScore = correctSynonyms.length > 0 
      ? Math.max(0, (correctSynonymSelections - incorrectSynonymSelections) / correctSynonyms.length)
      : 0;

    // Calculate antonym score  
    const correctAntonymSelections = selectedAntonyms.filter(ant => 
      correctAntonyms.includes(ant)
    ).length;
    const incorrectAntonymSelections = selectedAntonyms.filter(ant => 
      !correctAntonyms.includes(ant)
    ).length;
    const missedAntonyms = correctAntonyms.filter(ant => 
      !selectedAntonyms.includes(ant)
    ).length;
    
    // Antonym score: (correct - incorrect) / total possible, minimum 0
    const antonymScore = correctAntonyms.length > 0
      ? Math.max(0, (correctAntonymSelections - incorrectAntonymSelections) / correctAntonyms.length)
      : 0;

    const overallScore = (synonymScore + antonymScore) / 2;

    // Generate feedback
    const synonymFeedback = synonymScore >= 1.0 
      ? '✅ Perfect synonyms!'
      : synonymScore >= 0.8
      ? '🟢 Great synonym knowledge!'
      : synonymScore >= 0.5
      ? '🟡 Good, but missed some synonyms'
      : synonymScore > 0
      ? '🟠 Some correct, review synonyms'
      : '❌ Review synonym meanings';

    const antonymFeedback = antonymScore >= 1.0
      ? '✅ Perfect antonyms!'
      : antonymScore >= 0.8
      ? '🟢 Great antonym knowledge!'
      : antonymScore >= 0.5
      ? '🟡 Good, but missed some antonyms'
      : antonymScore > 0
      ? '🟠 Some correct, review antonyms'
      : '❌ Review antonym meanings';

    const overallFeedback = overallScore >= 0.9
      ? '🎉 Excellent vocabulary mastery!'
      : overallScore >= 0.7
      ? '👍 Strong vocabulary skills!'
      : overallScore >= 0.5
      ? '📚 Good progress, keep studying!'
      : '💪 Keep practicing vocabulary!';

    return {
      synonymScore: Math.round(synonymScore * 100) / 100,
      antonymScore: Math.round(antonymScore * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
      synonymFeedback,
      antonymFeedback,
      overallFeedback
    };
  }

  static calculateSynonymAntonymTestScore(
    results: SynonymAntonymTestResult[],
    totalTime: number
  ): {
    totalScore: number;
    maxScore: number;
    percentage: number;
    averageSynonymScore: number;
    averageAntonymScore: number;
    averageTime: number;
    perfectScores: number;
    goodScores: number;
    needsWork: number;
  } {
    const totalScore = results.reduce((sum, result) => sum + result.overallScore, 0);
    const maxScore = results.length;
    const percentage = (totalScore / maxScore) * 100;
    
    const averageSynonymScore = results.reduce((sum, r) => sum + r.synonymScore, 0) / results.length;
    const averageAntonymScore = results.reduce((sum, r) => sum + r.antonymScore, 0) / results.length;
    const averageTime = totalTime / results.length / 1000; // in seconds
    
    const perfectScores = results.filter(r => r.overallScore >= 0.9).length;
    const goodScores = results.filter(r => r.overallScore >= 0.7 && r.overallScore < 0.9).length;
    const needsWork = results.filter(r => r.overallScore < 0.5).length;
    
    return {
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore,
      percentage: Math.round(percentage),
      averageSynonymScore: Math.round(averageSynonymScore * 100) / 100,
      averageAntonymScore: Math.round(averageAntonymScore * 100) / 100,
      averageTime: Math.round(averageTime * 10) / 10,
      perfectScores,
      goodScores,
      needsWork
    };
  }
}