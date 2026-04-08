import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBVFj-2wjzxUenCl-tYMmf8IRLrcvlUerI',
  authDomain: 'ai-bum.firebaseapp.com',
  projectId: 'ai-bum',
  storageBucket: 'ai-bum.firebasestorage.app',
  messagingSenderId: '65994794423',
  appId: '1:65994794423:web:e1d16b4fe3b9d5ee1b3432',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
