# WordPlay - GRE Vocabulary Learning App

A modern, interactive vocabulary learning application designed to help students master GRE vocabulary using spaced repetition and adaptive learning techniques.

## Features

### 📚 Comprehensive Learning
- **Spaced Repetition System**: Smart algorithm that shows words when you need to review them
- **Flashcard Practice**: Interactive flashcards with Bengali translations
- **Multiple Test Modes**: Choose from various test formats including multiple choice and fill-in-the-blank
- **Progress Tracking**: Visual dashboards showing your learning progress

### 🎯 Study Tools
- **Adaptive Learning**: System adjusts difficulty based on your performance
- **Mastery Levels**: Track which words you've mastered
- **Weak Words Focus**: Automatically identify and review challenging words
- **Study Sessions**: Organized learning sessions with statistics

### ☁️ Google Drive Sync (NEW!)
- **Cross-Device Sync**: Access your progress from any device
- **Auto-Sync**: Automatically backs up your progress to Google Drive
- **Smart Merging**: Intelligently combines data from multiple devices
- **Secure Storage**: Your data is privately stored in your Google Drive

### ⚙️ Customization
- **Flexible Settings**: Customize cards per session, practice mode, and more
- **Theme Options**: Light/Dark mode support (coming soon)
- **Study Goals**: Set daily goals and track your streak
- **Import/Export**: Backup and restore your data locally

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- A modern web browser
- (Optional) Google account for cloud sync

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd word-play
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Google Drive Sync Setup

To enable cloud synchronization:

1. Follow the detailed setup guide in [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)
2. Create Google OAuth credentials
3. Add your Client ID to `.env` file
4. Sign in through Settings > Data tab

## Usage

### Flashcard Practice
1. Navigate to the Flashcards section
2. Choose your study mode (Spaced Repetition recommended)
3. Review words and mark your confidence level
4. System automatically schedules next review

### Taking Tests
1. Go to the Tests section
2. Select test type and difficulty
3. Answer questions within the time limit
4. Review your results and see correct answers

### Syncing Progress
1. Go to Settings > Data tab
2. Sign in with Google
3. Enable Auto-Sync for automatic backups
4. Or manually sync with "Sync Now" button

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS3 with modern features
- **State Management**: React Hooks
- **Storage**: LocalStorage + Google Drive API
- **Authentication**: Google OAuth 2.0
- **Routing**: React Router

## Project Structure

```
word-play/
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic and API services
│   ├── types/          # TypeScript type definitions
│   ├── data/           # Vocabulary data
│   └── utils/          # Utility functions
├── public/             # Static assets
└── dist/               # Production build
```

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Features Roadmap

- [ ] Dark mode theme
- [x] Google Drive sync
- [ ] Progressive Web App (PWA)
- [ ] Spaced repetition visualization
- [ ] Custom word lists
- [ ] Audio pronunciation
- [ ] Community word lists
- [ ] Mobile app version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- GRE vocabulary data from various educational sources
- Spaced repetition algorithm based on SuperMemo SM-2
- Icons from various open-source icon libraries
