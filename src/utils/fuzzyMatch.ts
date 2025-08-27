/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching in sentence tests
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  
  const matrix: number[][] = [];
  
  // Initialize first row and column
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

/**
 * Check if two words are close enough to be considered a match
 * Returns score: 1.0 for exact match, 0.5 for fuzzy match, 0 for no match
 */
export function fuzzyMatchScore(userAnswer: string, correctAnswer: string): number {
  const user = userAnswer.toLowerCase().trim();
  const correct = correctAnswer.toLowerCase().trim();
  
  // Exact match
  if (user === correct) {
    return 1.0;
  }
  
  // Empty or very short answers get no fuzzy matching
  if (user.length === 0 || correct.length < 3) {
    return 0;
  }
  
  const distance = levenshteinDistance(user, correct);
  
  // Allow up to 2 character differences for fuzzy matching
  if (distance <= 2) {
    return 0.5;
  }
  
  // Check if it's a partial match (user typed part of the word)
  if (correct.includes(user) && user.length >= 3) {
    return 0.3;
  }
  
  if (user.includes(correct) && correct.length >= 3) {
    return 0.3;
  }
  
  return 0;
}

/**
 * Normalize string for comparison (remove punctuation, extra spaces)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
}

/**
 * Generate similar words for multiple choice distractors
 */
export function generateSimilarWords(targetWord: string, allWords: string[]): string[] {
  const target = targetWord.toLowerCase();
  const similar: string[] = [];
  
  for (const word of allWords) {
    const w = word.toLowerCase();
    if (w === target) continue;
    
    // Words with similar length
    if (Math.abs(w.length - target.length) <= 2) {
      similar.push(word);
    }
    
    // Words starting with same letter
    if (w.charAt(0) === target.charAt(0) && w.length > 2) {
      similar.push(word);
    }
    
    // Words with similar ending
    if (w.length > 3 && target.length > 3) {
      if (w.slice(-2) === target.slice(-2)) {
        similar.push(word);
      }
    }
  }
  
  // Remove duplicates and shuffle
  const uniqueSimilar = [...new Set(similar)];
  return uniqueSimilar.sort(() => Math.random() - 0.5);
}