import { WordRecord } from '../types';

export class DataManager {
  private static words: WordRecord[] = [];

  static async loadWords(): Promise<WordRecord[]> {
    if (this.words.length === 0) {
      try {
        const response = await fetch('/words.txt');
        const text = await response.text();
        const wordsData = JSON.parse(text);
        this.words = wordsData.map((word: any, index: number) => ({
          ...word,
          id: word.word.toLowerCase() + '-' + index
        }));
      } catch (error) {
        console.error('Error loading words:', error);
        this.words = [];
      }
    }
    return this.words;
  }

  static getWords(): WordRecord[] {
    return this.words;
  }

  static getWordById(id: string): WordRecord | undefined {
    return this.words.find(word => (word as any).id === id);
  }

  static getRandomWords(count: number): WordRecord[] {
    const shuffled = [...this.words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  static searchWords(query: string): WordRecord[] {
    const lowercaseQuery = query.toLowerCase();
    return this.words.filter(word => 
      word.word.toLowerCase().includes(lowercaseQuery) ||
      word.meaning.toLowerCase().includes(lowercaseQuery) ||
      word.example.toLowerCase().includes(lowercaseQuery) ||
      word.synonyms.some(syn => syn.toLowerCase().includes(lowercaseQuery)) ||
      word.antonyms.some(ant => ant.toLowerCase().includes(lowercaseQuery))
    );
  }

  static validateWordData(data: any[]): boolean {
    if (!Array.isArray(data)) return false;
    
    return data.every(item => 
      typeof item.word === 'string' &&
      typeof item.meaning === 'string' &&
      typeof item.example === 'string' &&
      Array.isArray(item.synonyms) &&
      Array.isArray(item.antonyms)
    );
  }

  static deduplicateWords(words: WordRecord[]): WordRecord[] {
    const seen = new Set<string>();
    return words.filter(word => {
      const key = word.word.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}