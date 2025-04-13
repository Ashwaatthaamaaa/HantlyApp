import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

export let BASE_URL = 'https://apihandyman.programmingtrends.com';

const firebaseConfig = { 
  apiKey: "AIzaSyAEmgQHAfg2KXqD0myjpSuxQArJdiP8cR4",
  authDomain: "cmscontroller-b545b.firebaseapp.com",
  databaseURL: "https://cmscontroller-b545b-default-rtdb.firebaseio.com",
  projectId: "cmscontroller-b545b",
  storageBucket: "cmscontroller-b545b.firebasestorage.app",
  messagingSenderId: "1001805810301",
  appId: "1:1001805810301:web:8643b5334e2fef72727f14",
  measurementId: "G-97MT5QQF1Y"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const fetchBaseUrlFromFirebase = async (): Promise<void> => {
  try {
    const snapshot = await get(ref(db, 'config'));
    if (snapshot.exists()) {
      const config = snapshot.val();
      if (config.useFirebaseUrl === true && typeof config.baseUrl === 'string') {
        BASE_URL = config.baseUrl;
        console.log('✅ BASE_URL updated from Firebase:', BASE_URL);
      } else {
        console.log('ℹ️ useFirebaseUrl is false or baseUrl is invalid. Using default BASE_URL.');
      }
    } else {
      console.warn('⚠️ No config found in Firebase');
    }
  } catch (error) {
    console.error('❌ Error fetching config from Firebase:', error);
  }
};

