import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Home } from './components/Home/Home';
import { FlashcardSession } from './components/FlashcardSession/FlashcardSession';
import { MatchTest } from './components/Tests/MatchTest';
import { SentenceTest } from './components/Tests/SentenceTest';
import { SynonymAntonymTest } from './components/Tests/SynonymAntonymTest';
import { ProgressDashboard } from './components/Progress/ProgressDashboard';
import { Settings } from './components/Settings/Settings';
import { ProgressTracker } from './services/ProgressTracker';
import { GoogleDriveSync } from './services/GoogleDriveSync';
import { GoogleAuth } from './services/GoogleAuth';
import './App.css'

function App() {
  useEffect(() => {
    // Set up auto-sync callback
    if (GoogleDriveSync.isAutoSyncEnabled() && GoogleAuth.getCurrentUser()) {
      ProgressTracker.setSyncCallback(() => {
        console.log('🔄 Auto-syncing to Google Drive...');
        GoogleDriveSync.syncWithGoogleDrive('merge').catch((error) => {
          console.error('Auto-sync failed:', error);
        });
      });
    }

    return () => {
      ProgressTracker.setSyncCallback(null);
    };
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flashcards/:sessionType" element={<FlashcardSessionWrapper />} />
          <Route path="/tests/match" element={<MatchTest />} />
          <Route path="/tests/sentence" element={<SentenceTest />} />
          <Route path="/tests/synonym-antonym" element={<SynonymAntonymTest />} />
          <Route path="/tests" element={<TestsMenu />} />
          <Route path="/progress" element={<ProgressDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function FlashcardSessionWrapper() {
  const { sessionType } = useParams();
  
  const getSessionProps = (type) => {
    switch (type) {
      case 'due':
        return { sessionType: 'due', maxCards: 999 };
      case 'new':
        return { sessionType: 'new', maxCards: 10 };
      case 'quick':
        return { sessionType: 'random', maxCards: 10 };
      case 'weak':
        return { sessionType: 'weak', maxCards: 15 };
      case 'random':
      default:
        return { sessionType: 'random', maxCards: 15 };
    }
  };

  const sessionProps = getSessionProps(sessionType);
  
  return (
    <FlashcardSession 
      {...sessionProps}
      onSessionEnd={(stats) => {
        console.log('Session completed:', stats);
      }}
    />
  );
}

function TestsMenu() {
  const navigate = useNavigate();
  
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px', 
      textAlign: 'center' 
    }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <span style={{
          display: 'inline-block',
          width: '24px',
          height: '24px',
          background: '#2c3e50',
          borderRadius: '4px',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>T</span>
        </span>
        Vocabulary Tests
      </h1>
      <p style={{ color: '#7f8c8d', marginBottom: '40px', fontSize: '1.1rem' }}>
        Test your vocabulary knowledge with different types of challenges
      </p>
      
      <div style={{ 
        display: 'grid', 
        gap: '20px', 
        maxWidth: '600px', 
        margin: '0 auto' 
      }}>
        <button
          onClick={() => navigate('/tests/match')}
          style={{
            background: 'linear-gradient(135deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-block',
              width: '28px',
              height: '28px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '50%',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#2980b9',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>≈</span>
            </span>
            <span>Word Matching Test</span>
          </div>
          <div style={{ fontSize: '0.9rem', opacity: '0.9', textAlign: 'center' }}>
            Match English words with their Bangla meanings
          </div>
        </button>
        
        <button
          onClick={() => navigate('/tests/sentence')}
          style={{
            background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-block',
              width: '28px',
              height: '28px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '6px',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#8e44ad',
                fontSize: '12px',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>___</span>
            </span>
            <span>Sentence Fill-in Test</span>
          </div>
          <div style={{ fontSize: '0.9rem', opacity: '0.9', textAlign: 'center' }}>
            Complete sentences with the correct words
          </div>
        </button>
        
        <button
          onClick={() => navigate('/tests/synonym-antonym')}
          style={{
            background: 'linear-gradient(135deg, #e67e22, #d35400)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-block',
              width: '28px',
              height: '28px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '50% 10% 50% 10%',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transform: 'rotate(45deg)'
            }}>
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                color: '#d35400',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>⇄</span>
            </span>
            <span>Synonym/Antonym Test</span>
          </div>
          <div style={{ fontSize: '0.9rem', opacity: '0.9', textAlign: 'center' }}>
            Identify synonyms and antonyms
          </div>
        </button>
      </div>
      
      <button
        onClick={() => navigate('/')}
        style={{
          background: '#34495e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '30px',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.background = '#2c3e50';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.target.style.background = '#34495e';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            position: 'relative',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#34495e',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>←</span>
          </span>
          <span>Back to Dashboard</span>
        </div>
      </button>
    </div>
  );
}

export default App
