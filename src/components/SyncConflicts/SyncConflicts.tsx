import React, { useState } from 'react';
import { GoogleDriveSync } from '../../services/GoogleDriveSync';
import { ProgressTracker } from '../../services/ProgressTracker';
import { SyncConflict } from '../../types';
import './SyncConflicts.css';

interface SyncConflictsProps {
  conflicts: SyncConflict[];
  onRefresh?: () => void;
}

export const SyncConflicts: React.FC<SyncConflictsProps> = ({ conflicts: initialConflicts, onRefresh }) => {
  const [conflicts, setConflicts] = useState<SyncConflict[]>(initialConflicts);

  // Update local state when props change
  React.useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);

  const handleResolveConflict = (wordId: string, useLocal: boolean) => {
    const conflict = conflicts.find(c => c.wordId === wordId);
    if (!conflict) return;

    // Apply the user's choice to the actual data
    const userProgress = ProgressTracker.getUserProgress();
    const dataToKeep = useLocal ? conflict.localData : conflict.remoteData;

    const updatedProgress = userProgress.map(p => {
      if (p.wordId === wordId) {
        // Apply the chosen version
        return {
          ...p,
          ...dataToKeep,
          // Update sync metadata
          lastModified: new Date(),
          syncVersion: (dataToKeep.syncVersion || 0) + 1,
        };
      }
      return p;
    });

    ProgressTracker.saveUserProgress(updatedProgress);

    // Remove the resolved conflict
    const updatedConflicts = conflicts.filter(c => c.wordId !== wordId);
    setConflicts(updatedConflicts);

    // Update sync status
    const syncStatus = GoogleDriveSync.getSyncStatus();
    GoogleDriveSync.updateSyncStatus({ ...syncStatus, conflicts: updatedConflicts });

    // Notify parent to refresh if needed
    if (onRefresh && updatedConflicts.length === 0) {
      setTimeout(() => onRefresh(), 500);
    }
  };

  const handleResolveAll = (useLocal: boolean) => {
    const userProgress = ProgressTracker.getUserProgress();

    // Apply all conflict resolutions
    const updatedProgress = userProgress.map(p => {
      const conflict = conflicts.find(c => c.wordId === p.wordId);
      if (conflict) {
        const dataToKeep = useLocal ? conflict.localData : conflict.remoteData;
        return {
          ...p,
          ...dataToKeep,
          lastModified: new Date(),
          syncVersion: (dataToKeep.syncVersion || 0) + 1,
        };
      }
      return p;
    });

    ProgressTracker.saveUserProgress(updatedProgress);

    // Clear all conflicts
    setConflicts([]);
    const syncStatus = GoogleDriveSync.getSyncStatus();
    GoogleDriveSync.updateSyncStatus({ ...syncStatus, conflicts: [] });

    // Notify parent to refresh
    if (onRefresh) {
      setTimeout(() => onRefresh(), 500);
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
