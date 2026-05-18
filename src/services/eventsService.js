import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const EVENT_TYPES = [
  { key: 'family', label: '가족', emoji: '👨‍👩‍👧‍👦', color: '#3182F6' },
  { key: 'medical', label: '병원', emoji: '🏥', color: '#EF4444' },
  { key: 'activity', label: '활동', emoji: '🌳', color: '#00C471' },
  { key: 'other', label: '기타', emoji: '📌', color: '#9B72CF' },
];

export function getEventTypeMeta(key) {
  return EVENT_TYPES.find((t) => t.key === key) || EVENT_TYPES[3];
}

export async function addEvent({ title, date, time, type = 'other', description = '' }) {
  if (!title || !date) throw new Error('제목과 날짜는 필수입니다');
  return addDoc(collection(db, 'events'), {
    title: title.trim(),
    date,
    time: time || '',
    type,
    description: description.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteEvent(eventId) {
  return deleteDoc(doc(db, 'events', eventId));
}

export function subscribeEvents(callback) {
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}
