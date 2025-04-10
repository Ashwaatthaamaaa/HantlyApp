// File: utils/storage.ts
import * as SecureStore from 'expo-secure-store';

const COMPANY_ID_KEY = 'partnerCompanyId';
const KNOWN_JOB_IDS_KEY = 'knownCreatedJobIds';

export async function storeCompanyId(companyId: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(COMPANY_ID_KEY, String(companyId));
    console.log('[Storage] Company ID stored successfully.');
  } catch (error) {
    console.error('[Storage] Error storing company ID:', error);
  }
}

export async function getCompanyId(): Promise<number | null> {
  try {
    const idString = await SecureStore.getItemAsync(COMPANY_ID_KEY);
    if (idString) {
      const id = parseInt(idString, 10);
      return isNaN(id) ? null : id;
    }
    return null;
  } catch (error) {
    console.error('[Storage] Error getting company ID:', error);
    return null;
  }
}

export async function removeCompanyId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COMPANY_ID_KEY);
    console.log('[Storage] Company ID removed successfully.');
  } catch (error) {
    console.error('[Storage] Error removing company ID:', error);
  }
}

export async function storeKnownJobIds(jobIds: number[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(jobIds);
    await SecureStore.setItemAsync(KNOWN_JOB_IDS_KEY, jsonValue);
     // console.log('[Storage] Known job IDs stored.'); // Optional: can be noisy
  } catch (error) {
    console.error('[Storage] Error storing known job IDs:', error);
  }
}

export async function getKnownJobIds(): Promise<number[]> {
  try {
    const jsonValue = await SecureStore.getItemAsync(KNOWN_JOB_IDS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('[Storage] Error getting known job IDs:', error);
    return [];
  }
}

export async function clearKnownJobIds(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KNOWN_JOB_IDS_KEY);
      console.log('[Storage] Known job IDs cleared.');
    } catch (error) {
      console.error('[Storage] Error clearing known job IDs:', error);
    }
  }