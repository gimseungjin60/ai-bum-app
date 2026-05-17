import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Firestore 컬렉션 실시간 구독 훅
 * @param {string} collectionName
 * @param {string} orderField
 * @param {number} limitCount
 * @param {Array<[string, string, any]>} filters - [["deviceId", "==", "frame-001"], ...] 형식
 */
export function useCollection(collectionName, orderField = 'createdAt', limitCount = 20, filters = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters 배열 reference 안정화 (JSON.stringify 키 사용)
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    try {
      const constraints = [orderBy(orderField, 'desc'), limit(limitCount)];
      // where 필터 동적 추가
      filters.forEach(([field, op, value]) => {
        constraints.unshift(where(field, op, value));
      });

      const q = query(collection(db, collectionName), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setData(items);
          setLoading(false);
        },
        (err) => {
          console.warn(`[useCollection:${collectionName}] error:`, err.message);
          setError(err);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [collectionName, orderField, limitCount, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}
