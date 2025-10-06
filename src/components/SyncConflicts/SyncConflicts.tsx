import React, { useState, useEffect } from 'react';
import { GoogleDriveSync, SyncStatus } from '../../services/GoogleDriveSync';
import { SyncConflict } from '../../types';
import './SyncConflicts.css';

export const SyncConflicts: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    const status = GoogleDriveSync.getSyncStatus();
    setSyncStatus(status);
    setConflicts(status.conflicts || []);
  }, []);

  const handleResolveConflict = (wordId: string, useLocal: boolean) => {
    // Filter out the resolved conflict
    const updatedConflicts = conflicts.filter(c => c.wordId !== wordId);
    setConflicts(updatedConflicts);

    // Update sync status
    if (syncStatus) {
      const updatedStatus = { ...syncStatus, conflicts: updatedConflicts };
      GoogleDriveSync.updateSyncStatus(updatedStatus);
      setSyncStatus(updatedStatus);
    }
  };

  const handleResolveAll = (useLocal: boolean) => {
    setConflicts([]);
    if (syncStatus) {
      const updatedStatus = { ...syncStatus, conflicts: [] };
      GoogleDriveSync.updateSyncStatus(updatedStatus);
      setSyncStatus(updatedStatus);
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="sync-conflicts-overlay">
      <div className="sync-conflicts-modal">
        <div className="sync-conflicts-header">
          <h2>⚠️ Sync Conflicts Detected</h2>
          <p>
            The same words have been modified on different devices. Choose which
            version to keep.
          </p>
        </div>

        <div className="conflicts-list">
          {conflicts.map((conflict) => (
            <div key={conflict.wordId} className="conflict-item">
              <div className="conflict-word">
                <strong>{conflict.wordId}</strong>
                <span className="conflict-type">{conflict.conflictType}</span>
              </div>

              <div className="conflict-comparison">
                <div className="conflict-version local">
                  <h4>Local (This Device)</h4>
                  <div className="conflict-details">
                    <div>Last Reviewed: {new Date(conflict.localData.lastReviewed).toLocaleString()}</div>
                    <div>Repetitions: {conflict.localData.repetitions}</div>
                    <div>Mastery: {conflict.localData.masteryLevel}%</div>
                    <div>Accuracy: {(conflict.localData.accuracy * 100).toFixed(0)}%</div>
                  </div>
                  <button
                    className="resolve-button use-local"
                    onClick={() => handleResolveConflict(conflict.wordId, true)}
                  >
                    Keep Local
                  </button>
                </div>

                <div className="conflict-version remote">
                  <h4>Remote (Google Drive)</h4>
                  <div className="conflict-details">
                    <div>Last Reviewed: {new Date(conflict.remoteData.lastReviewed).toLocaleString()}</div>
                    <div>Repetitions: {conflict.remoteData.repetitions}</div>
                    <div>Mastery: {conflict.remoteData.masteryLevel}%</div>
                    <div>Accuracy: {(conflict.remoteData.accuracy * 100).toFixed(0)}%</div>
                  </div>
                  <button
                    className="resolve-button use-remote"
                    onClick={() => handleResolveConflict(conflict.wordId, false)}
                  >
                    Keep Remote
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="conflicts-actions">
          <button
            className="bulk-action-button keep-all-local"
            onClick={() => handleResolveAll(true)}
          >
            Keep All Local ({conflicts.length})
          </button>
          <button
            className="bulk-action-button keep-all-remote"
            onClick={() => handleResolveAll(false)}
          >
            Keep All Remote ({conflicts.length})
          </button>
        </div>
      </div>
    </div>
  );
};
