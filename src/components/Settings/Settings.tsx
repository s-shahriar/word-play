import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressTracker } from '../../services/ProgressTracker';
import './Settings.css';

interface UserSettings {
  flashcardSettings: {
    maxCardsPerSession: number;
    showMeaningFirst: boolean;
    autoAdvanceTime: number; // seconds, 0 = manual
    practiceMode: 'spaced' | 'random' | 'sequential';
  };
  testSettings: {
    defaultTimeLimit: number; // minutes
    questionCount: number;
    showHints: boolean;
    immediateSpanback: boolean;
  };
  appearanceSettings: {
    fontSize: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
  };
  studySettings: {
    dailyGoal: number; // cards per day
    reminderTime: string; // HH:MM format
    weekendStudy: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  flashcardSettings: {
    maxCardsPerSession: 20,
    showMeaningFirst: false,
    autoAdvanceTime: 0,
    practiceMode: 'spaced'
  },
  testSettings: {
    defaultTimeLimit: 10,
    questionCount: 10,
    showHints: true,
    immediateSpanback: true
  },
  appearanceSettings: {
    fontSize: 'medium',
    theme: 'light',
    animations: true
  },
  studySettings: {
    dailyGoal: 20,
    reminderTime: '19:00',
    weekendStudy: true
  }
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'flashcard' | 'test' | 'appearance' | 'study' | 'data'>('flashcard');
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const stored = localStorage.getItem('wordplay-settings');
    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    }
  };

  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('wordplay-settings', JSON.stringify(newSettings));
  };

  const updateFlashcardSettings = (key: keyof UserSettings['flashcardSettings'], value: any) => {
    const newSettings = {
      ...settings,
      flashcardSettings: {
        ...settings.flashcardSettings,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const updateTestSettings = (key: keyof UserSettings['testSettings'], value: any) => {
    const newSettings = {
      ...settings,
      testSettings: {
        ...settings.testSettings,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const updateAppearanceSettings = (key: keyof UserSettings['appearanceSettings'], value: any) => {
    const newSettings = {
      ...settings,
      appearanceSettings: {
        ...settings.appearanceSettings,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const updateStudySettings = (key: keyof UserSettings['studySettings'], value: any) => {
    const newSettings = {
      ...settings,
      studySettings: {
        ...settings.studySettings,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleExportData = () => {
    const data = ProgressTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordplay-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = ProgressTracker.importData(content);
        if (success) {
          alert('Data imported successfully! Please refresh the page.');
        } else {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearData = (dataType: string) => {
    if (dataType === 'all') {
      ProgressTracker.clearAllData();
      localStorage.removeItem('wordplay-settings');
      alert('All data cleared successfully!');
      window.location.reload();
    } else if (dataType === 'progress') {
      const progress = ProgressTracker.getUserProgress();
      progress.forEach(p => {
        p.repetitions = 0;
        p.easeFactor = 2.5;
        p.interval = 1;
        p.nextReview = new Date();
        p.accuracy = 0;
        p.correctCount = 0;
        p.masteryLevel = 0;
      });
      ProgressTracker.saveUserProgress(progress);
      alert('Learning progress reset successfully!');
    }
    setShowConfirmDialog(null);
  };

  const resetSettings = () => {
    saveSettings(DEFAULT_SETTINGS);
    alert('Settings reset to defaults!');
  };

  const tabs = [
    { id: 'flashcard', name: 'Flashcards', icon: '🎴' },
    { id: 'test', name: 'Tests', icon: '📝' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'study', name: 'Study', icon: '📚' },
    { id: 'data', name: 'Data', icon: '💾' }
  ];

  return (
    <div className="settings">
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>⚙️ Settings</h1>
        <p>Customize your learning experience</p>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {activeTab === 'flashcard' && (
            <div className="setting-section">
              <h2>🎴 Flashcard Settings</h2>
              
              <div className="setting-group">
                <label>Max Cards Per Session</label>
                <div className="range-input">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={settings.flashcardSettings.maxCardsPerSession}
                    onChange={(e) => updateFlashcardSettings('maxCardsPerSession', parseInt(e.target.value))}
                  />
                  <span className="range-value">{settings.flashcardSettings.maxCardsPerSession}</span>
                </div>
              </div>

              <div className="setting-group">
                <label>Practice Mode</label>
                <select
                  value={settings.flashcardSettings.practiceMode}
                  onChange={(e) => updateFlashcardSettings('practiceMode', e.target.value)}
                >
                  <option value="spaced">Spaced Repetition (Recommended)</option>
                  <option value="random">Random Order</option>
                  <option value="sequential">Sequential Order</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Show Meaning First</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.flashcardSettings.showMeaningFirst}
                    onChange={(e) => updateFlashcardSettings('showMeaningFirst', e.target.checked)}
                  />
                  <span className="toggle-description">
                    Show Bangla meaning first, then English word
                  </span>
                </div>
              </div>

              <div className="setting-group">
                <label>Auto Advance Timer</label>
                <div className="range-input">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={settings.flashcardSettings.autoAdvanceTime}
                    onChange={(e) => updateFlashcardSettings('autoAdvanceTime', parseInt(e.target.value))}
                  />
                  <span className="range-value">
                    {settings.flashcardSettings.autoAdvanceTime === 0 ? 'Manual' : `${settings.flashcardSettings.autoAdvanceTime}s`}
                  </span>
                </div>
                <p className="setting-description">Automatically advance to next card (0 = manual)</p>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="setting-section">
              <h2>📝 Test Settings</h2>
              
              <div className="setting-group">
                <label>Default Time Limit (minutes)</label>
                <div className="range-input">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={settings.testSettings.defaultTimeLimit}
                    onChange={(e) => updateTestSettings('defaultTimeLimit', parseInt(e.target.value))}
                  />
                  <span className="range-value">{settings.testSettings.defaultTimeLimit}min</span>
                </div>
              </div>

              <div className="setting-group">
                <label>Default Question Count</label>
                <div className="range-input">
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={settings.testSettings.questionCount}
                    onChange={(e) => updateTestSettings('questionCount', parseInt(e.target.value))}
                  />
                  <span className="range-value">{settings.testSettings.questionCount}</span>
                </div>
              </div>

              <div className="setting-group">
                <label>Show Hints</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.testSettings.showHints}
                    onChange={(e) => updateTestSettings('showHints', e.target.checked)}
                  />
                  <span className="toggle-description">Show helpful hints during tests</span>
                </div>
              </div>

              <div className="setting-group">
                <label>Immediate Feedback</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.testSettings.immediateSpanback}
                    onChange={(e) => updateTestSettings('immediateSpanback', e.target.checked)}
                  />
                  <span className="toggle-description">Show correct answers immediately after each question</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="setting-section">
              <h2>🎨 Appearance Settings</h2>
              
              <div className="setting-group">
                <label>Font Size</label>
                <div className="radio-group">
                  {['small', 'medium', 'large'].map(size => (
                    <label key={size} className="radio-option">
                      <input
                        type="radio"
                        name="fontSize"
                        value={size}
                        checked={settings.appearanceSettings.fontSize === size}
                        onChange={(e) => updateAppearanceSettings('fontSize', e.target.value)}
                      />
                      <span className="radio-label">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label>Theme</label>
                <div className="radio-group">
                  {[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto (System)' }
                  ].map(theme => (
                    <label key={theme.value} className="radio-option">
                      <input
                        type="radio"
                        name="theme"
                        value={theme.value}
                        checked={settings.appearanceSettings.theme === theme.value}
                        onChange={(e) => updateAppearanceSettings('theme', e.target.value)}
                      />
                      <span className="radio-label">{theme.label}</span>
                    </label>
                  ))}
                </div>
                <p className="setting-description">Dark mode coming soon!</p>
              </div>

              <div className="setting-group">
                <label>Animations</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.appearanceSettings.animations}
                    onChange={(e) => updateAppearanceSettings('animations', e.target.checked)}
                  />
                  <span className="toggle-description">Enable smooth animations and transitions</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'study' && (
            <div className="setting-section">
              <h2>📚 Study Settings</h2>
              
              <div className="setting-group">
                <label>Daily Goal (cards)</label>
                <div className="range-input">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.studySettings.dailyGoal}
                    onChange={(e) => updateStudySettings('dailyGoal', parseInt(e.target.value))}
                  />
                  <span className="range-value">{settings.studySettings.dailyGoal}</span>
                </div>
                <p className="setting-description">Number of cards to review each day</p>
              </div>

              <div className="setting-group">
                <label>Study Reminder Time</label>
                <input
                  type="time"
                  value={settings.studySettings.reminderTime}
                  onChange={(e) => updateStudySettings('reminderTime', e.target.value)}
                  className="time-input"
                />
                <p className="setting-description">Daily notification reminder (browser notifications coming soon)</p>
              </div>

              <div className="setting-group">
                <label>Weekend Study</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.studySettings.weekendStudy}
                    onChange={(e) => updateStudySettings('weekendStudy', e.target.checked)}
                  />
                  <span className="toggle-description">Include weekends in daily goals and reminders</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="setting-section">
              <h2>💾 Data Management</h2>
              
              <div className="data-section">
                <h3>Backup & Restore</h3>
                <div className="data-buttons">
                  <button className="data-button export" onClick={handleExportData}>
                    📤 Export Data
                  </button>
                  <label className="data-button import">
                    📥 Import Data
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <p className="data-description">
                  Export your progress data as a backup file, or import from a previous backup.
                </p>
              </div>

              <div className="data-section">
                <h3>Reset Options</h3>
                <div className="data-buttons">
                  <button 
                    className="data-button danger"
                    onClick={() => setShowConfirmDialog('progress')}
                  >
                    🔄 Reset Learning Progress
                  </button>
                  <button 
                    className="data-button danger"
                    onClick={() => setShowConfirmDialog('all')}
                  >
                    🗑️ Clear All Data
                  </button>
                </div>
                <p className="data-description">
                  Reset your learning progress or clear all data including settings.
                </p>
              </div>

              <div className="data-section">
                <h3>Settings</h3>
                <div className="data-buttons">
                  <button className="data-button secondary" onClick={resetSettings}>
                    ⚙️ Reset Settings to Default
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>⚠️ Confirm Action</h3>
            <p>
              {showConfirmDialog === 'all' 
                ? 'This will permanently delete ALL your data including progress, settings, and test results. This action cannot be undone.'
                : 'This will reset your learning progress for all words back to the beginning. Your test history will be preserved.'
              }
            </p>
            <div className="confirm-buttons">
              <button 
                className="confirm-button cancel"
                onClick={() => setShowConfirmDialog(null)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button danger"
                onClick={() => handleClearData(showConfirmDialog)}
              >
                {showConfirmDialog === 'all' ? 'Delete All Data' : 'Reset Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};