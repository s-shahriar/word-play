import { ProgressTracker } from './ProgressTracker';
import { GoogleAuth } from './GoogleAuth';
import { SyncConflict, SyncMetadata } from '../types';

export interface SyncStatus {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  error: string | null;
  conflicts?: SyncConflict[];
  recordCount?: number;
  checksum?: string;
}

/**
 * GoogleDriveSync - Optional Cloud Backup Feature
 *
 * This service provides optional Google Drive integration for cross-device sync.
 * The app works completely offline without Google Drive - all data is stored locally.
 * Users can optionally enable Google Drive sync for backup and multi-device access.
 */
export class GoogleDriveSync {
  private static readonly FILE_NAME = 'wordplay-data.json';
  private static readonly FOLDER_NAME = 'WordPlay';
  private static readonly SYNC_STATUS_KEY = 'wordplay-sync-status';
  private static readonly DEVICE_ID_KEY = 'wordplay-device-id';
  private static readonly SYNC_METADATA_KEY = 'wordplay-sync-metadata';

  private static getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private static calculateChecksum(data: string): string {
    // Simple checksum using hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private static getSyncMetadata(): SyncMetadata | null {
    const metadata = localStorage.getItem(this.SYNC_METADATA_KEY);
    if (!metadata) return null;
    const parsed = JSON.parse(metadata);
    return {
      ...parsed,
      lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null,
    };
  }

  private static saveSyncMetadata(metadata: SyncMetadata): void {
    localStorage.setItem(this.SYNC_METADATA_KEY, JSON.stringify(metadata));
  }

  static async uploadToGoogleDrive(): Promise<void> {
    try {
      await GoogleAuth.refreshTokenIfNeeded();

      const data = ProgressTracker.exportData();
      const parsedData = JSON.parse(data);

      // Add sync metadata
      const metadata: SyncMetadata = {
        lastSyncTime: new Date(),
        dataChecksum: this.calculateChecksum(data),
        recordCount: parsedData.userProgress?.length || 0,
        deviceId: this.getOrCreateDeviceId(),
        syncVersion: (this.getSyncMetadata()?.syncVersion || 0) + 1,
      };

      const dataWithMetadata = JSON.stringify({
        ...parsedData,
        syncMetadata: metadata,
      });

      const folderId = await this.getOrCreateFolder();
      const fileId = await this.getFileId(folderId);

      const user = GoogleAuth.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      let response;

      if (fileId) {
        // Update existing file - don't include parents
        const fileMetadata = {
          name: this.FILE_NAME,
          mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', new Blob([dataWithMetadata], { type: 'application/json' }));

        response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            body: form,
          }
        );
      } else {
        // Create new file - include parents
        const fileMetadata = {
          name: this.FILE_NAME,
          mimeType: 'application/json',
          parents: [folderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', new Blob([dataWithMetadata], { type: 'application/json' }));

        response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            body: form,
          }
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google Drive session expired. Please sign in again to use sync features.');
        }
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error(errorData.error?.message || `Google Drive upload failed: ${response.statusText}`);
      }

      // Save metadata locally
      this.saveSyncMetadata(metadata);

      this.updateSyncStatus({
        lastSyncTime: new Date(),
        isSyncing: false,
        error: null,
        recordCount: metadata.recordCount,
        checksum: metadata.dataChecksum,
      });

      console.log(`✅ Synced ${metadata.recordCount} records to Google Drive`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.updateSyncStatus({ lastSyncTime: null, isSyncing: false, error: errorMessage });
      throw error;
    }
  }

  static async downloadFromGoogleDrive(): Promise<boolean> {
    try {
      await GoogleAuth.refreshTokenIfNeeded();

      const folderId = await this.getOrCreateFolder();
      const fileId = await this.getFileId(folderId);

      if (!fileId) {
        console.log('No backup file found in Google Drive');
        return false;
      }

      const user = GoogleAuth.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google Drive session expired. Please sign in again to use sync features.');
        }
        throw new Error(`Google Drive download failed: ${response.statusText}`);
      }

      const data = await response.text();
      const success = ProgressTracker.importData(data);

      if (success) {
        this.updateSyncStatus({ lastSyncTime: new Date(), isSyncing: false, error: null });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      this.updateSyncStatus({ lastSyncTime: null, isSyncing: false, error: errorMessage });
      throw error;
    }
  }

  static async syncWithGoogleDrive(strategy: 'upload' | 'download' | 'merge' = 'merge'): Promise<void> {
    this.updateSyncStatus({ lastSyncTime: null, isSyncing: true, error: null });

    try {
      if (strategy === 'upload') {
        await this.uploadToGoogleDrive();
      } else if (strategy === 'download') {
        await this.downloadFromGoogleDrive();
      } else {
        // Merge strategy: compare timestamps and merge data
        await this.mergeData();
      }
    } finally {
      const status = this.getSyncStatus();
      this.updateSyncStatus({ ...status, isSyncing: false });
    }
  }

  private static async mergeData(): Promise<void> {
    try {
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.getFileId(folderId);

      if (!fileId) {
        // No remote file, just upload
        await this.uploadToGoogleDrive();
        return;
      }

      const user = GoogleAuth.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Download remote data
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google Drive session expired. Please sign in again to use sync features.');
        }
        throw new Error(`Google Drive download failed: ${response.statusText}`);
      }

      const remoteData = JSON.parse(await response.text());
      const localData = JSON.parse(ProgressTracker.exportData());

      // Merge logic: take the most recent data for each word
      const mergedProgress = this.mergeUserProgress(
        localData.userProgress || [],
        remoteData.userProgress || []
      );

      const mergedTestResults = this.mergeArraysByTimestamp(
        localData.testResults || [],
        remoteData.testResults || []
      );

      const mergedFlashcardSessions = this.mergeArraysByTimestamp(
        localData.flashcardSessions || [],
        remoteData.flashcardSessions || []
      );

      const mergedTestSessions = this.mergeArraysByTimestamp(
        localData.testSessions || [],
        remoteData.testSessions || []
      );

      // Import merged data
      const mergedDataStr = JSON.stringify({
        userProgress: mergedProgress,
        testResults: mergedTestResults,
        flashcardSessions: mergedFlashcardSessions,
        testSessions: mergedTestSessions,
        exportDate: new Date().toISOString(),
      });

      ProgressTracker.importData(mergedDataStr);

      // Upload merged data
      await this.uploadToGoogleDrive();
    } catch (error) {
      throw error;
    }
  }

  private static mergeUserProgress(local: any[], remote: any[]): any[] {
    const merged = new Map();
    const conflicts: SyncConflict[] = [];

    // Add all local progress with lastModified timestamps
    local.forEach(progress => {
      // Add lastModified if not present
      if (!progress.lastModified) {
        progress.lastModified = progress.lastReviewed || new Date();
        progress.syncVersion = 1;
      }
      merged.set(progress.wordId, { ...progress, source: 'local' });
    });

    // Merge with remote
    remote.forEach(progress => {
      const existing = merged.get(progress.wordId);

      // Add lastModified if not present
      if (!progress.lastModified) {
        progress.lastModified = progress.lastReviewed || new Date();
        progress.syncVersion = 1;
      }

      if (!existing) {
        // Word only exists in remote, add it
        merged.set(progress.wordId, { ...progress, source: 'remote' });
      } else {
        // Both have this word - need to merge
        const localTime = new Date(existing.lastModified).getTime();
        const remoteTime = new Date(progress.lastModified).getTime();

        // Check if both have been modified (conflict scenario)
        // Detect conflicts when:
        // 1. Both have different sync versions (modified on different devices)
        // 2. Time difference is significant (more than 5 minutes = different sessions)
        // 3. Progress values are different (not just timestamp difference)
        const hasSignificantDifference =
          existing.repetitions !== progress.repetitions ||
          existing.masteryLevel !== progress.masteryLevel ||
          existing.correctCount !== progress.correctCount;

        if (existing.syncVersion && progress.syncVersion &&
            existing.syncVersion !== progress.syncVersion &&
            Math.abs(localTime - remoteTime) > 300000 && // More than 5 minutes apart
            hasSignificantDifference) {
          conflicts.push({
            wordId: progress.wordId,
            localData: existing,
            remoteData: progress,
            conflictType: 'both-modified',
          });
        }

        // Use timestamp-based resolution
        if (remoteTime > localTime) {
          // Remote is newer
          merged.set(progress.wordId, { ...progress, source: 'remote' });
        } else if (remoteTime < localTime) {
          // Local is newer, keep existing
        } else {
          // Same timestamp, use more advanced progress
          if (progress.repetitions > existing.repetitions ||
              (progress.repetitions === existing.repetitions && progress.masteryLevel > existing.masteryLevel)) {
            merged.set(progress.wordId, { ...progress, source: 'remote' });
          }
        }
      }
    });

    // Store conflicts for UI display
    if (conflicts.length > 0) {
      const status = this.getSyncStatus();
      this.updateSyncStatus({ ...status, conflicts });
      console.warn(`⚠️  Found ${conflicts.length} sync conflicts`);
    }

    // Remove source tag before returning
    return Array.from(merged.values()).map(p => {
      const { source, ...progress } = p;
      // Increment sync version
      progress.syncVersion = (progress.syncVersion || 0) + 1;
      progress.lastModified = new Date();
      return progress;
    });
  }

  private static mergeArraysByTimestamp(local: any[], remote: any[]): any[] {
    const merged = new Map();

    // Combine all items
    [...local, ...remote].forEach(item => {
      const key = item.id || item.timestamp || JSON.stringify(item);
      merged.set(key, item);
    });

    return Array.from(merged.values());
  }

  private static async getOrCreateFolder(): Promise<string> {
    const user = GoogleAuth.getCurrentUser();
    if (!user) throw new Error('Not authenticated with Google Drive. Please sign in to use sync features.');

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

    if (searchResponse.status === 401) {
      throw new Error('Google Drive session expired. Please sign in again to use sync features.');
    }

    const searchResult = await searchResponse.json();

    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }

    // Create new folder
    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
    );

    const folder = await createResponse.json();
    return folder.id;
  }

  private static async getFileId(folderId: string): Promise<string | null> {
    const user = GoogleAuth.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

    const result = await response.json();
    return result.files && result.files.length > 0 ? result.files[0].id : null;
  }

  static getSyncStatus(): SyncStatus {
    const status = localStorage.getItem(this.SYNC_STATUS_KEY);
    if (!status) {
      return { lastSyncTime: null, isSyncing: false, error: null };
    }

    const parsed = JSON.parse(status);
    return {
      ...parsed,
      lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null,
    };
  }

  static updateSyncStatus(status: SyncStatus): void {
    localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(status));
  }

  static enableAutoSync(): void {
    localStorage.setItem('wordplay-auto-sync', 'true');
  }

  static disableAutoSync(): void {
    localStorage.removeItem('wordplay-auto-sync');
  }

  static isAutoSyncEnabled(): boolean {
    return localStorage.getItem('wordplay-auto-sync') === 'true';
  }
}
