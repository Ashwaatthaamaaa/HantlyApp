// File: tasks/JobPollingTask.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { checkAndNotifyForNewJobs } from '../utils/notifications'; // Adjust path

const BACKGROUND_FETCH_TASK = 'check-new-jobs';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log(`[Background Task ${BACKGROUND_FETCH_TASK}] Running...`);
    const gotNewData = await checkAndNotifyForNewJobs('background');
    console.log(`[Background Task ${BACKGROUND_FETCH_TASK}] Finished. New data? ${gotNewData}`);

    return gotNewData ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error(`[Background Task ${BACKGROUND_FETCH_TASK}] Failed:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// --- Registration/Unregistration functions ---
// It's often better to call these from your main app logic (e.g., AuthContext)
// But they are defined here for clarity on the task name

export async function registerBackgroundFetchAsync() {
    try {
        console.log('[Background Fetch] Registering task:', BACKGROUND_FETCH_TASK);
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 15 * 60, // seconds (approx 15 minutes)
            stopOnTerminate: false, // android only: keep task registered after app terminated
            startOnBoot: true,      // android only: start task after device boot
        });
        console.log('[Background Fetch] Task registered successfully.');
    } catch (error) {
        console.error('[Background Fetch] Failed to register task:', error);
    }
}

export async function unregisterBackgroundFetchAsync() {
    try {
        console.log('[Background Fetch] Unregistering task:', BACKGROUND_FETCH_TASK);
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log('[Background Fetch] Task unregistered successfully.');
    } catch (error) {
        console.error('[Background Fetch] Failed to unregister task:', error);
    }
}