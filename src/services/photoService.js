import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../config/firebase';

/**
 * 사진을 Firebase Storage에 업로드하고 Firestore에 메타데이터 저장
 * @param {string} uri - 로컬 이미지 URI
 * @param {object} metadata - { uploaderName, caption, emoji, deviceId, uploaderUid }
 * @returns {Promise<string>} - 저장된 문서 ID
 */
export async function uploadPhoto(uri, metadata = {}) {
  // 1. 이미지를 blob으로 변환
  const response = await fetch(uri);
  const blob = await response.blob();

  // 2. Storage 경로 생성
  const filename = `photos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storageRef = ref(storage, filename);

  // 3. Storage에 업로드
  const snapshot = await uploadBytesResumable(storageRef, blob);
  const downloadURL = await getDownloadURL(snapshot.ref);

  // 4. Firestore photos 컬렉션에 메타데이터 저장
  // deviceId 기반 공유 — 같은 시니어 기기에 페어링한 가족 모두가 같은 사진 풀을 봄
  const docRef = await addDoc(collection(db, 'photos'), {
    uri: downloadURL,
    storagePath: filename,
    uploaderName: metadata.uploaderName || '가족',
    uploaderUid: metadata.uploaderUid || null,
    deviceId: metadata.deviceId || 'frame-001',
    caption: metadata.caption || '',
    emoji: metadata.emoji || '😊',
    isMemory: false,
    displayOnDevice: true,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 시니어 디바이스에 표시할지 여부 토글
 */
export async function togglePhotoDisplay(photoId, displayOnDevice) {
  await updateDoc(doc(db, 'photos', photoId), { displayOnDevice });
}

/**
 * 사진 업로드 후 알림 생성
 */
export async function uploadPhotoWithNotification(uri, metadata = {}) {
  const docId = await uploadPhoto(uri, metadata);

  // 일반 알림 생성 — 활성 시니어 기기에만
  await addDoc(collection(db, 'notifications'), {
    device_id: metadata.deviceId || 'frame-001',
    type: 'general',
    title: '새로운 사진이 등록되었습니다',
    body: metadata.caption
      ? `${metadata.uploaderName || '가족'}님이 "${metadata.caption}" 사진을 올렸어요.`
      : `${metadata.uploaderName || '가족'}님이 새 사진을 올렸어요.`,
    read: false,
    createdAt: serverTimestamp(),
  });

  return docId;
}
