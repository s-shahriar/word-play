# Google Drive Sync Improvements

## Problem Summary
Your app experienced data loss where 10 words studied on localhost didn't sync to production, resulting in:
- **Localhost:** 85 words, 45 due cards
- **Production:** 75 words, 35 due cards
- **Root cause:** Session on Oct 5 wasn't synced, then production downloaded stale data

## Solutions Implemented

### 1. **Timestamps & Sync Metadata** ✅
Added tracking to know which data is newer:
- `lastModified` field on each word progress
- `syncVersion` for conflict detection
- Device ID to identify where changes came from
- Data checksum to verify integrity

**Files changed:**
- `src/types/index.ts` - Added `lastModified` and `syncVersion` to `UserProgress`
- `src/types/index.ts` - Added `SyncMetadata` and `SyncConflict` interfaces

### 2. **Auto-Sync After Every Session** ✅
No more manual syncing needed:
- Automatically syncs after flashcard sessions
- Automatically syncs after test results
- Automatically syncs after any progress update
- Uses debouncing to avoid too many API calls (1 second delay)

**How it works:**
- ProgressTracker already had a `triggerSync()` callback mechanism
- App.jsx now sets up the callback on startup if auto-sync is enabled
- Every time data changes, sync happens automatically

**Files changed:**
- `src/App.jsx` - Added auto-sync initialization with useEffect
- `src/services/GoogleDriveSync.ts` - Already had auto-sync toggle methods

### 3. **Improved Merge Logic** ✅
Smart merging prevents data loss:
- Uses timestamps to pick newer data
- Detects when both devices modified the same word
- Flags conflicts for user review
- Falls back to "more advanced" progress if timestamps are equal

**Merge strategy:**
```
1. If word only in local → keep local
2. If word only in remote → add remote
3. If both have it:
   a. Compare lastModified timestamps
   b. Keep the newer one
   c. If times are close (< 1 min), flag as conflict
   d. If equal time, keep higher repetitions/mastery
```

**Files changed:**
- `src/services/GoogleDriveSync.ts` - Rewrote `mergeUserProgress()` method

### 4. **Sync Verification with Checksums** ✅
Know if sync succeeded:
- Calculates checksum of all data
- Stores record count
- Logs sync success with details
- Displays in sync status

**Console messages you'll see:**
```
✅ Synced 85 records to Google Drive
⚠️ Found 2 sync conflicts
```

**Files changed:**
- `src/services/GoogleDriveSync.ts` - Added `calculateChecksum()` and metadata tracking
- `src/services/GoogleDriveSync.ts` - Updated upload/download to include metadata

### 5. **Conflict Resolution UI** ✅
Visual interface to resolve conflicts:
- Modal popup when conflicts are detected
- Shows local vs remote data side-by-side
- Compare: last reviewed, repetitions, mastery, accuracy
- Choose which version to keep (per word or bulk)
- Clean, modern UI with color coding

**Features:**
- Local version (blue)
- Remote version (red)
- Keep individual conflicts
- Keep all local / Keep all remote buttons

**Files created:**
- `src/components/SyncConflicts/SyncConflicts.tsx` - React component
- `src/components/SyncConflicts/SyncConflicts.css` - Styling
- `src/components/Settings/Settings.tsx` - Added SyncConflicts to Settings page

## How to Use

### Enable Auto-Sync
1. Go to Settings → Data tab
2. Toggle "Auto-Sync with Google Drive"
3. That's it! All changes sync automatically

### Manual Sync
1. Go to Settings → Data tab
2. Click "Sync Now"
3. Choose strategy:
   - **Merge (recommended):** Combines local + remote
   - **Upload:** Force push local to cloud
   - **Download:** Force pull from cloud (careful - overwrites local!)

### Resolve Conflicts
1. If conflicts are detected, a modal pops up
2. Review each conflict
3. Choose to keep local or remote version
4. Or use "Keep All Local" / "Keep All Remote" for bulk resolution

## Technical Details

### Metadata Structure
```typescript
{
  lastSyncTime: Date,
  dataChecksum: string,
  recordCount: number,
  deviceId: string,
  syncVersion: number
}
```

### UserProgress Enhancement
```typescript
interface UserProgress {
  // ... existing fields
  lastModified?: Date;     // NEW: When was this record last changed
  syncVersion?: number;    // NEW: Increments on each sync
}
```

### Sync Flow
```
1. User studies flashcard
2. ProgressTracker.saveTestResult() → triggerSync()
3. After 1 second debounce → GoogleDriveSync.syncWithGoogleDrive('merge')
4. Download remote data
5. Merge with local data (timestamp-based)
6. Detect conflicts if any
7. Upload merged data
8. Save metadata locally
9. Update sync status
```

## Benefits

✅ **No more data loss** - All changes are automatically synced
✅ **Conflict detection** - Know when devices disagree
✅ **Timestamp tracking** - Always use the newest data
✅ **Sync verification** - Checksums confirm data integrity
✅ **User control** - Resolve conflicts your way
✅ **Device awareness** - Know which device made changes
✅ **Version tracking** - Detect concurrent modifications

## Important Notes

### When Conflicts Occur
Conflicts happen when:
- Same word modified on 2 devices within 1 minute
- Different syncVersion numbers
- Neither device has synced yet

### Best Practices
1. **Keep auto-sync enabled** on all devices
2. **Wait for sync** after study sessions before switching devices
3. **Check for conflicts** in Settings if you see the warning
4. **Don't use "Download" mode** unless you're sure (it overwrites local data)

### Migration
Existing data will be automatically upgraded:
- `lastModified` will be set to `lastReviewed` date
- `syncVersion` will start at 1
- No data loss during upgrade

## Monitoring

### Check Sync Status
In Settings → Data tab, you'll see:
- Last sync time
- Record count
- Checksum
- Any errors
- Conflict count (if any)

### Console Logs
Watch browser console for:
- `🔄 Auto-syncing to Google Drive...`
- `✅ Synced X records to Google Drive`
- `⚠️ Found X sync conflicts`

## Troubleshooting

### Sync Not Working
1. Check if auto-sync is enabled in Settings
2. Check if you're logged into Google
3. Look for errors in console
4. Try manual sync

### Conflicts Keep Appearing
1. Make sure auto-sync is enabled on BOTH devices
2. Wait a few seconds after studying before switching devices
3. Resolve all conflicts before studying more

### Data Mismatch
1. Export backups from both devices
2. Compare record counts
3. Use the device with MORE records as source
4. Upload from that device
5. Download on other device

## Future Enhancements (Optional)

Consider adding:
- Real-time sync using WebSockets
- Offline queue for failed syncs
- Sync history/audit log
- Multi-device session locking
- Backup/restore specific to conflicts
- Email notifications on conflicts
