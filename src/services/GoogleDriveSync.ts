import { ProgressTracker } from './ProgressTracker';
import { GoogleAuth } from './GoogleAuth';

export interface SyncStatus {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  error: string | null;
}

export class GoogleDriveSync {
  private static readonly FILE_NAME = 'wordplay-data.json';
  private static readonly FOLDER_NAME = 'WordPlay';
  private static readonly SYNC_STATUS_KEY = 'wordplay-sync-status';

  static async uploadToGoogleDrive(): Promise<void> {
    try {
      await GoogleAuth.refreshTokenIfNeeded();

      const data = ProgressTracker.exportData();
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.getFileId(folderId);

      const user = GoogleAuth.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      let response;

      if (fileId) {
        // Update existing file - don't include parents
        const metadata = {
          name: this.FILE_NAME,
          mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([data], { type: 'application/json' }));

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
        const metadata = {
          name: this.FILE_NAME,
          mimeType: 'application/json',
          parents: [folderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([data], { type: 'application/json' }));

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
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
      }

      this.updateSyncStatus({ lastSyncTime: new Date(), isSyncing: false, error: null });
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
        throw new Error(`Download failed: ${response.statusText}`);
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
        throw new Error(`Download failed: ${response.statusText}`);
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

    // Add all local progress
    local.forEach(progress => {
      merged.set(progress.wordId, progress);
    });

    // Merge with remote, keeping the most advanced progress
    remote.forEach(progress => {
      const existing = merged.get(progress.wordId);
      if (!existing) {
        merged.set(progress.wordId, progress);
      } else {
        // Keep the progress with more repetitions or higher mastery
        if (progress.repetitions > existing.repetitions ||
            (progress.repetitions === existing.repetitions && progress.masteryLevel > existing.masteryLevel)) {
          merged.set(progress.wordId, progress);
        }
      }
    });

    return Array.from(merged.values());
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
    if (!user) throw new Error('Not authenticated');

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

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

  private static updateSyncStatus(status: SyncStatus): void {
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
