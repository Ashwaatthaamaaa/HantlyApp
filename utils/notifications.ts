// File: utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { getCompanyId, getKnownJobIds, storeKnownJobIds } from './storage'; // Adjust path if needed
import { BASE_URL } from '@/constants/Api'; // Adjust path if needed

// Define a simple type for the API response structure
interface JobTicket {
    ticketId: number;
    // Add other relevant fields if needed for notification content
    reportingDescription?: string;
    toCraftmanType?: string;
}

// Shared function to check for new jobs and notify
export async function checkAndNotifyForNewJobs(
    source: 'foreground' | 'background' // Optional: for logging
): Promise<boolean> {
  console.log(`[${source}] Checking for new jobs...`);
  const companyId = await getCompanyId();

  if (!companyId) {
    console.log(`[${source}] No company ID found, skipping check.`);
    return false;
  }

  const knownJobIds = await getKnownJobIds();
  const knownJobIdSet = new Set(knownJobIds);
  let newJobsFound = false;

  // --- Replace with your actual API URL ---
  const API_URL = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?CompanyId=${companyId}&Status=Created`;
  // --- ------------------------------- ---

  try {
    const response = await fetch(API_URL, { headers: { 'accept': 'text/plain' } }); // Assuming plain text or json is acceptable
     console.log(`[${source}] API Call to ${API_URL} - Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Assuming the response is JSON array of JobTicket objects
    const currentJobs: JobTicket[] = await response.json();
    const currentJobIdSet = new Set(currentJobs.map(job => job.ticketId));
    const newJobIds: number[] = [];
    const newJobNotifications: Promise<string>[] = [];

    for (const job of currentJobs) {
      if (!knownJobIdSet.has(job.ticketId)) {
        newJobsFound = true;
        newJobIds.push(job.ticketId);
        console.log(`[${source}] New job found: Ticket ID ${job.ticketId}`);

        // Schedule a local notification for the new job
        newJobNotifications.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Job Request Available!',
              body: `Job for ${job.toCraftmanType || 'service'} available. Ticket: ${job.ticketId}`, // Customize body
              data: { ticketId: job.ticketId }, // IMPORTANT: Pass ticketId here
              sound: 'default', // Or provide custom sound file
            },
            trigger: null, // Send immediately
          })
        );
      }
    }

    if (newJobsFound) {
        console.log(`[${source}] Scheduling ${newJobNotifications.length} notifications.`);
        await Promise.all(newJobNotifications);
        // Update stored known IDs only after successfully scheduling notifications
        await storeKnownJobIds(Array.from(currentJobIdSet));
        console.log(`[${source}] Updated known jobs list.`);
    } else {
        // Optional: Update storage even if no new jobs, to prune old ones if API only returns active 'created'
        // Consider if the stored list should *exactly* match the API response or just add new ones
        // Current implementation only updates if new jobs are found. To match exactly:
         if (knownJobIds.length !== currentJobIdSet.size || !knownJobIds.every(id => currentJobIdSet.has(id))) {
            // Only update storage if the set actually changed
            // await storeKnownJobIds(Array.from(currentJobIdSet));
            // console.log(`[${source}] Pruned/updated known jobs list.`);
         } else {
            // console.log(`[${source}] No new jobs found, list is current.`); // Optional
         }
    }

    return newJobsFound;

  } catch (error) {
    console.error(`[${source}] Error checking for new jobs:`, error);
    return false; // Indicate failure or no new data due to error
  }
}