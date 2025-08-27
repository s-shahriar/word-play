# Word Play - Comprehensive Implementation Plan

## Project Overview

A React-based web application for learning English vocabulary with Bangla translations, featuring flashcards, spaced repetition, multiple test types, and comprehensive progress tracking.

## 1. Core Features Implementation

### 1.1 Flashcard System

**Requirements:**

- Display English word, Bangla meaning, pronunciation (audio), example sentence, synonyms, antonyms
- Controls: Show/hide meaning, Next, Previous, Flip (front/back), Mark Known/Unknown
- Spaced Repetition (SM-2 algorithm) for automatic review scheduling

**Implementation Tasks:**

- [ ] Create FlashcardComponent with front/back views
- [ ] Implement audio pronunciation using Web Speech API (MVP) or pre-generated TTS
- [ ] Add card navigation controls (Next, Previous, Flip)
- [ ] Implement show/hide meaning toggle
- [ ] Create knowledge marking system (Easy, Good, Hard, Again)
- [ ] Integrate SM-2 algorithm for scheduling
- [ ] Store user progress in localStorage (MVP) / server (later)

### 1.2 Testing System

#### 1.2.1 Word-Matching Test

**Requirements:**

- Present English word with multiple Bangla meanings (or vice versa)
- User selects correct match
- Timed rounds, increasing difficulty, randomized distractors from synonyms/antonyms

**Implementation Tasks:**

- [ ] Create MatchTestComponent
- [ ] Implement question generation with 4 choices (1 correct + 3 distractors)
- [ ] Add timer functionality
- [ ] Create difficulty progression system
- [ ] Implement distractor selection from synonyms/antonyms pool
- [ ] Add scoring system (+1 per correct, optional time bonus)

#### 1.2.2 Sentence (Usage) Test

**Requirements:**

- Fill-in-the-blank in example sentences
- Select correct word to complete sentence
- Evaluate correct usage with feedback

**Implementation Tasks:**

- [ ] Create SentenceTestComponent
- [ ] Implement blank generation in example sentences
- [ ] Create multiple choice selection
- [ ] Add fuzzy matching for typo tolerance (Levenshtein ≤ 2)
- [ ] Implement feedback system with explanations
- [ ] Scoring: +1 exact match, 0.5 fuzzy match, 0 wrong

#### 1.2.3 Synonym/Antonym Tests

**Requirements:**

- Show word + Bangla meaning, ask for synonym(s) and antonym(s)
- Multi-select or pair matching interface

**Implementation Tasks:**

- [ ] Create SynonymAntonymTestComponent
- [ ] Implement multi-select interface
- [ ] Add pair matching functionality
- [ ] Create scoring system: correctSelected / totalCorrect
- [ ] Add validation for multiple selections

### 1.3 Progress & Analytics

**Requirements:**

- Track accuracy, streaks, time spent, SRS review schedule, mastery % per word
- Dashboard with weak words, recent performance, suggested practice

**Implementation Tasks:**

- [ ] Create ProgressTracker service
- [ ] Implement analytics data model (accuracy, streaks, time, mastery)
- [ ] Create Dashboard component
- [ ] Add weak words identification algorithm
- [ ] Implement performance charts/visualizations
- [ ] Create suggested practice recommendations
- [ ] Store analytics in localStorage/IndexedDB (MVP) / server (later)

### 1.4 Import/Admin Tools

**Requirements:**

- Accept compiled JSON (500 words) and validate/deduplicate
- Editor to correct translations, add examples, tweak synonyms/antonyms

**Implementation Tasks:**

- [ ] Create JSON import functionality
- [ ] Implement data validation and deduplication
- [ ] Create AdminPanel component
- [ ] Build word editor interface
- [ ] Add translation correction tools
- [ ] Implement bulk editing capabilities

### 1.5 Accessibility & Internationalization

**Requirements:**

- Bangla UI strings, proper fonts, screen reader compatibility, keyboard navigation

**Implementation Tasks:**

- [ ] Set up i18n framework (react-intl or i18next)
- [ ] Create Bangla UI translations
- [ ] Add proper Bangla fonts
- [ ] Implement ARIA labels and roles
- [ ] Add keyboard navigation support
- [ ] Test with screen readers
- [ ] Add visible focus states

### 1.6 Offline Support (Optional)

**Requirements:**

- Cache DB and TTS audio, allow review when offline, sync on reconnect

**Implementation Tasks:**

- [ ] Implement Service Worker for offline caching
- [ ] Set up IndexedDB for local data storage
- [ ] Cache TTS audio files
- [ ] Create offline mode detection
- [ ] Implement sync functionality on reconnect
- [ ] Add offline status indicators

## 2. Data Model

### 2.1 Word Record Structure

Based on words.txt analysis:

```typescript
interface WordRecord {
  word: string; // English word
  meaning: string; // Bangla meaning
  example: string; // Example sentence
  synonyms: string[]; // Array of synonyms
  antonyms: string[]; // Array of antonyms
}
```

### 2.2 User Progress Model

```typescript
interface UserProgress {
  wordId: string;
  easeFactor: number; // SM-2 ease factor (2.5 initial)
  repetitions: number; // Number of successful repetitions
  interval: number; // Days until next review
  nextReview: Date; // Next review date
  totalSeen: number; // Total times encountered
  correctCount: number; // Correct answers
  accuracy: number; // correctCount / totalSeen
  lastReviewed: Date; // Last review timestamp
  masteryLevel: number; // 0-100% mastery
}
```

### 2.3 Test Results Model

```typescript
interface TestResult {
  testType: "flashcard" | "match" | "sentence" | "synonym-antonym";
  wordId: string;
  correct: boolean;
  timeSpent: number; // milliseconds
  timestamp: Date;
  quality: number; // SM-2 quality (0-5)
}
```

## 3. Execution Flows & Implementation

### 3.1 Flashcard Study Session Flow

```
1. Fetch due words from SRS system
2. If empty, select new words by priority
3. Present flashcard front (word + audio button)
4. User actions: Show Meaning, Flip, Mark quality (0-5)
5. Calculate next review using SM-2 algorithm
6. Save progress and move to next card
7. Show session summary
```

**Implementation Tasks:**

- [ ] Create SRS service with SM-2 algorithm
- [ ] Implement word prioritization logic
- [ ] Create session management system
- [ ] Build flashcard presentation logic
- [ ] Add progress saving functionality

### 3.2 Word Matching Test Generation

```
1. Select N target words for test
2. For each word:
   - Get correct Bangla meaning
   - Generate 3 distractors from other words' meanings/synonyms
   - Shuffle choices
3. Present question with timer
4. Record answer and update progress
```

**Implementation Tasks:**

- [ ] Create test generation algorithm
- [ ] Implement distractor selection logic
- [ ] Add question shuffling
- [ ] Build answer validation
- [ ] Create progress updates

### 3.3 Sentence Fill-in Test

```
1. Select word and example sentence
2. Replace target word with blank/underscores
3. Generate multiple choices (correct + similar words)
4. Present with optional fuzzy matching
5. Evaluate and provide feedback
```

**Implementation Tasks:**

- [ ] Create sentence parsing logic
- [ ] Implement blank generation
- [ ] Add multiple choice creation
- [ ] Build fuzzy matching (Levenshtein distance)
- [ ] Create feedback system

## 4. Algorithms & Scoring

### 4.1 Spaced Repetition (SM-2)

**Implementation:**

- Use quality scores 0-5 for user responses
- Store easeFactor, repetitions, interval per user+word
- If quality < 3: reset repetitions and schedule immediate review
- Use nextReview date to fetch due cards

**Tasks:**

- [ ] Implement SM-2 algorithm class
- [ ] Create quality scoring interface
- [ ] Add immediate review logic for failed cards
- [ ] Build due cards fetching system

### 4.2 Test Scoring Systems

- **Match Test:** +1 per correct, optional timed bonus
- **Sentence Test:** +1 exact, 0.5 fuzzy, 0 wrong
- **Synonym/Antonym:** correctSelected / totalCorrect

**Tasks:**

- [ ] Implement scoring algorithms for each test type
- [ ] Add optional time-based bonuses
- [ ] Create fuzzy matching scoring
- [ ] Build precision/recall calculations

### 4.3 Difficulty & Progression

**Adaptive Logic:**

- Calculate forgetRate = 1 - (correct/seen)
- Prioritize high forgetRate words for review
- Adjust test difficulty based on user performance

**Tasks:**

- [ ] Create adaptive difficulty algorithm
- [ ] Implement forget rate calculations
- [ ] Build word prioritization system
- [ ] Add performance-based adjustments

## 5. Implementation Strategy (MVP to Full)

### Stage 1: MVP (Core Functionality)

- [ ] Basic flashcard system with manual navigation
- [ ] JSON import functionality
- [ ] Web Speech API for pronunciation
- [ ] localStorage for user progress
- [ ] Simple word matching test
- [ ] Basic UI with React components

### Stage 2: Enhanced Features

- [ ] SM-2 spaced repetition system
- [ ] All test types (match, sentence, synonym/antonym)
- [ ] Progress analytics and dashboard
- [ ] Improved UI/UX with animations
- [ ] Timer-based challenges

### Stage 3: Production Ready

- [ ] Server-side data sync
- [ ] User authentication
- [ ] Advanced analytics
- [ ] Offline support with IndexedDB
- [ ] Pre-generated TTS audio
- [ ] Admin panel for content management

## 6. Technical Implementation Details

### 6.1 Project Structure

```
src/
├── components/
│   ├── Flashcard/
│   ├── Tests/
│   ├── Dashboard/
│   ├── Admin/
│   └── Common/
├── services/
│   ├── SRS/
│   ├── DataManager/
│   ├── AudioService/
│   └── Analytics/
├── hooks/
├── utils/
├── types/
└── data/
```

### 6.2 Required Dependencies

**Core:**

- React 19.1.1 (already installed)
- React Router for navigation
- Context API for state management

**Additional:**

- react-intl or i18next for internationalization
- date-fns for date manipulation
- fuse.js for fuzzy search
- recharts for analytics visualization
- workbox for offline support

### 6.3 Audio Implementation

**MVP:** Web Speech API (`speechSynthesis`)
**Production:** Pre-generated TTS (Google Cloud TTS/AWS Polly)

- Store audio URLs in CDN/object storage
- Cache in IndexedDB for offline use

### 6.4 Data Storage

**MVP:** localStorage for user progress
**Production:** Server with sync capability

- IndexedDB for offline data
- Background sync for connectivity issues

## 7. Gamification Features

### 7.1 Quick Practice Modes

- [ ] "10 Quick Cards" - rapid flashcard session
- [ ] "Weak Words Only" - focus on low accuracy words
- [ ] "Random Review" - surprise word selection
- [ ] "Time Challenge" - beat the clock mode
- [ ] "Streak Builder" - consecutive correct answers

### 7.2 Advanced Gamification

- [ ] Daily challenges with specific word sets
- [ ] Achievement badges (streak milestones, test scores)
- [ ] Leaderboards (if multiplayer later)
- [ ] Progress streaks with streak freeze power-ups
- [ ] Word mastery levels (Bronze, Silver, Gold)
- [ ] Weekly word goals and progress tracking
- [ ] Themed word sets (academic, business, casual)
- [ ] Difficulty multipliers for scoring

## 8. Testing Strategy

### 8.1 Unit Tests

- [ ] SM-2 algorithm correctness
- [ ] Test generation logic
- [ ] Scoring calculations
- [ ] Data validation
- [ ] Progress tracking accuracy

### 8.2 Integration Tests

- [ ] Complete study session flows
- [ ] Data persistence and retrieval
- [ ] Audio playback functionality
- [ ] Offline/online sync behavior

## 9. Performance Considerations

### 9.1 Optimization Tasks

- [ ] Lazy load word data in chunks
- [ ] Implement virtual scrolling for large lists
- [ ] Bundle splitting for code optimization
- [ ] Image optimization for UI elements
- [ ] Memory management for long sessions

### 9.2 Monitoring

- [ ] Performance metrics tracking
- [ ] Error boundary implementation
- [ ] User interaction analytics
- [ ] Load time optimization

## Implementation Priority Order

1. **Data Model & Import System** - Foundation for all features
2. **Basic Flashcard System** - Core learning mechanism
3. **SM-2 Spaced Repetition** - Intelligence behind the system
4. **Word Matching Test** - First assessment type
5. **Progress Tracking** - User motivation and analytics
6. **Sentence Fill-in Test** - Advanced assessment
7. **Dashboard & Analytics** - User insights
8. **Synonym/Antonym Test** - Complete assessment suite
9. **Admin Tools** - Content management
10. **Gamification Features** - Enhanced user engagement
11. **Offline Support** - Advanced functionality
12. **Accessibility & i18n** - Inclusive design

This comprehensive plan ensures all requirements from plan.txt are covered while providing a clear roadmap for systematic implementation.
