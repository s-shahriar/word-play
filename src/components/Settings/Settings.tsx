import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressTracker } from '../../services/ProgressTracker';
import { GoogleAuth, GoogleUser } from '../../services/GoogleAuth';
import { GoogleDriveSync, SyncStatus } from '../../services/GoogleDriveSync';
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
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ lastSyncTime: null, isSyncing: false, error: null });
  const [autoSync, setAutoSync] = useState(false);
  const [showNotification, setShowNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    loadSettings();
    loadGoogleUser();
    initializeGoogleAuth();
  }, []);

  useEffect(() => {
    // Set up auto-sync callback
    if (autoSync && googleUser) {
      ProgressTracker.setSyncCallback(async () => {
        try {
          await GoogleDriveSync.uploadToGoogleDrive();
          console.log('Auto-sync completed');
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      });
    } else {
      ProgressTracker.setSyncCallback(null);
    }

    return () => {
      ProgressTracker.setSyncCallback(null);
    };
  }, [autoSync, googleUser]);

  const initializeGoogleAuth = async () => {
    try {
      await GoogleAuth.initialize();
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
    }
  };

  const loadGoogleUser = () => {
    const user = GoogleAuth.getCurrentUser();
    setGoogleUser(user);
    setAutoSync(GoogleDriveSync.isAutoSyncEnabled());
    setSyncStatus(GoogleDriveSync.getSyncStatus());
  };

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
          showNotificationPopup('success', 'Import Successful', 'Data imported successfully! Refreshing the page...');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showNotificationPopup('error', 'Import Failed', 'Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    // Reset input value so the same file can be selected again
    event.target.value = '';
  };

  const handleClearData = (dataType: string) => {
    if (dataType === 'all') {
      ProgressTracker.clearAllData();
      localStorage.removeItem('wordplay-settings');
      showNotificationPopup('success', 'Data Cleared', 'All data has been cleared successfully. Reloading...');
      setTimeout(() => window.location.reload(), 2000);
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
      showNotificationPopup('success', 'Progress Reset', 'Your learning progress has been reset successfully!');
    }
    setShowConfirmDialog(null);
  };

  const showNotificationPopup = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setShowNotification({ show: true, type, title, message });
    setTimeout(() => {
      setShowNotification({ show: false, type: 'info', title: '', message: '' });
    }, 4000);
  };

  const resetSettings = () => {
    saveSettings(DEFAULT_SETTINGS);
    showNotificationPopup('success', 'Settings Reset', 'All settings have been reset to defaults.');
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await GoogleAuth.login();
      setGoogleUser(user);
      showNotificationPopup('success', 'Login Successful', `Welcome, ${user.name}! You're now connected to Google Drive.`);
    } catch (error) {
      console.error('Google login failed:', error);
      showNotificationPopup('error', 'Login Failed', 'Failed to login with Google. Please try again.');
    }
  };

  const handleGoogleLogout = () => {
    GoogleAuth.logout();
    setGoogleUser(null);
    setAutoSync(false);
    GoogleDriveSync.disableAutoSync();
    showNotificationPopup('info', 'Logged Out', 'You have been successfully logged out from Google.');
  };

  const handleSyncNow = async () => {
    if (!googleUser) {
      showNotificationPopup('error', 'Not Logged In', 'Please sign in with Google first to sync your data.');
      return;
    }

    setSyncStatus({ ...syncStatus, isSyncing: true });
    try {
      await GoogleDriveSync.syncWithGoogleDrive('merge');
      setSyncStatus(GoogleDriveSync.getSyncStatus());
      showNotificationPopup('success', 'Sync Complete', 'Your data has been successfully synchronized with Google Drive.');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(GoogleDriveSync.getSyncStatus());

      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        setGoogleUser(null);
        showNotificationPopup('error', 'Session Expired', 'Your session has expired. Please sign in again.');
      } else {
        showNotificationPopup('error', 'Sync Failed', 'Failed to sync data. Please check your connection and try again.');
      }
    }
  };

  const handleUploadToCloud = async () => {
    if (!googleUser) {
      showNotificationPopup('error', 'Not Logged In', 'Please sign in with Google first to upload your data.');
      return;
    }

    setSyncStatus({ ...syncStatus, isSyncing: true });
    try {
      await GoogleDriveSync.uploadToGoogleDrive();
      setSyncStatus(GoogleDriveSync.getSyncStatus());
      showNotificationPopup('success', 'Upload Complete', 'Your local data has been successfully uploaded to Google Drive.');
    } catch (error) {
      console.error('Upload failed:', error);
      setSyncStatus(GoogleDriveSync.getSyncStatus());

      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        setGoogleUser(null);
        showNotificationPopup('error', 'Session Expired', 'Your session has expired. Please sign in again.');
      } else {
        showNotificationPopup('error', 'Upload Failed', 'Failed to upload data. Please check your connection and try again.');
      }
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!googleUser) {
      showNotificationPopup('error', 'Not Logged In', 'Please sign in with Google first to download your data.');
      return;
    }

    setSyncStatus({ ...syncStatus, isSyncing: true });
    try {
      const success = await GoogleDriveSync.downloadFromGoogleDrive();
      setSyncStatus(GoogleDriveSync.getSyncStatus());
      if (success) {
        showNotificationPopup('success', 'Download Complete', 'Data downloaded successfully! Refreshing the page...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        showNotificationPopup('info', 'No Backup Found', 'No backup file was found in your Google Drive.');
      }
    } catch (error) {
      console.error('Download failed:', error);
      setSyncStatus(GoogleDriveSync.getSyncStatus());

      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        setGoogleUser(null);
        showNotificationPopup('error', 'Session Expired', 'Your session has expired. Please sign in again.');
      } else {
        showNotificationPopup('error', 'Download Failed', 'Failed to download data. Please check your connection and try again.');
      }
    }
  };

  const toggleAutoSync = () => {
    if (!googleUser) {
      showNotificationPopup('error', 'Not Logged In', 'Please sign in with Google first to enable auto-sync.');
      return;
    }

    const newAutoSync = !autoSync;
    setAutoSync(newAutoSync);
    if (newAutoSync) {
      GoogleDriveSync.enableAutoSync();
      showNotificationPopup('success', 'Auto-Sync Enabled', 'Your progress will now automatically sync to Google Drive.');
      handleSyncNow(); // Sync immediately when enabled
    } else {
      GoogleDriveSync.disableAutoSync();
      showNotificationPopup('info', 'Auto-Sync Disabled', 'Automatic syncing has been turned off.');
    }
  };

  const tabs = [
    { id: 'flashcard', name: 'Flashcards', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> },
    { id: 'test', name: 'Tests', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg> },
    { id: 'appearance', name: 'Appearance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg> },
    { id: 'study', name: 'Study', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
    { id: 'data', name: 'Data', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline></svg> }
  ];

  return (
    <div className="settings">
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 14v6"></path>
            <path d="M12 1l3 3m-6 0l3-3"></path>
            <path d="M12 23l3-3m0 6l-3-3"></path>
            <path d="M1 12h6m14 0h6"></path>
            <path d="M1 12l3-3m0 6l-3-3"></path>
            <path d="M23 12l-3-3m0 6l3-3"></path>
          </svg>
          Settings
        </h1>
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
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Flashcard Settings
              </h2>
              
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
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Test Settings
              </h2>
              
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
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                </svg>
                Appearance Settings
              </h2>
              
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
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                Study Settings
              </h2>
              
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
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
                Data Management
              </h2>

              <div className="data-section">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
                  </svg>
                  Google Drive Sync
                </h3>

                {!googleUser ? (
                  <div>
                    <button className="data-button google-login" onClick={handleGoogleLogin}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem'}}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
                      </svg>
                      Sign in with Google
                    </button>
                    <p className="data-description">
                      Sign in with Google to sync your progress across all devices
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="google-user-info">
                      <img src={googleUser.picture} alt={googleUser.name} className="google-avatar" />
                      <div>
                        <div className="google-name">{googleUser.name}</div>
                        <div className="google-email">{googleUser.email}</div>
                      </div>
                      <button className="data-button secondary small" onClick={handleGoogleLogout}>
                        Sign Out
                      </button>
                    </div>

                    <div className="setting-group" style={{marginTop: '1rem'}}>
                      <label>Auto Sync</label>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={autoSync}
                          onChange={toggleAutoSync}
                        />
                        <span className="toggle-description">
                          Automatically sync when data changes
                        </span>
                      </div>
                    </div>

                    {syncStatus.lastSyncTime && (
                      <p className="sync-status">
                        Last synced: {syncStatus.lastSyncTime.toLocaleString()}
                      </p>
                    )}

                    {syncStatus.error && (
                      <p className="sync-error">Error: {syncStatus.error}</p>
                    )}

                    <div className="data-buttons">
                      <button
                        className="data-button primary"
                        onClick={handleSyncNow}
                        disabled={syncStatus.isSyncing}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem'}}>
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        className="data-button secondary"
                        onClick={handleUploadToCloud}
                        disabled={syncStatus.isSyncing}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem'}}>
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                        </svg>
                        Upload to Cloud
                      </button>
                      <button
                        className="data-button secondary"
                        onClick={handleDownloadFromCloud}
                        disabled={syncStatus.isSyncing}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem'}}>
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                        </svg>
                        Download from Cloud
                      </button>
                    </div>
                    <p className="data-description">
                      Sync merges local and cloud data intelligently. Upload/Download overwrites one with the other.
                    </p>
                  </div>
                )}
              </div>

              <div className="data-section">
                <h3>Backup & Restore</h3>
                <div className="data-buttons">
                  <button className="data-button export" onClick={handleExportData}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem'}}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7,10 12,15 17,10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export Data
                  </button>
                  <label className="data-button import">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem'}}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17,8 12,3 7,8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Import Data
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem'}}>
                      <polyline points="23,4 23,10 17,10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Reset Learning Progress
                  </button>
                  <button 
                    className="data-button danger"
                    onClick={() => setShowConfirmDialog('all')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem'}}>
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Clear All Data
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem'}}>
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 14v6"></path>
                      <path d="M12 1l3 3m-6 0l3-3"></path>
                      <path d="M12 23l3-3m0 6l-3-3"></path>
                      <path d="M1 12h6m14 0h6"></path>
                      <path d="M1 12l3-3m0 6l-3-3"></path>
                      <path d="M23 12l-3-3m0 6l3-3"></path>
                    </svg>
                    Reset Settings to Default
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
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Confirm Action
            </h3>
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

      {showNotification.show && (
        <div className={`notification-popup ${showNotification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {showNotification.type === 'success' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
              {showNotification.type === 'error' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
              {showNotification.type === 'info' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
            </div>
            <div className="notification-text">
              <h4>{showNotification.title}</h4>
              <p>{showNotification.message}</p>
            </div>
            <button
              className="notification-close"
              onClick={() => setShowNotification({ show: false, type: 'info', title: '', message: '' })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};