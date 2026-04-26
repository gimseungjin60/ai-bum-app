export const EMOTION_META = {
  happiness: { label: '행복', emoji: '😊', color: '#F59E0B' },
  neutral:   { label: '평온', emoji: '😐', color: '#A8A29E' },
  surprise:  { label: '놀람', emoji: '😮', color: '#FB923C' },
  sadness:   { label: '슬픔', emoji: '😢', color: '#60A5FA' },
  anger:     { label: '분노', emoji: '😠', color: '#EF4444' },
  fear:      { label: '두려움', emoji: '😨', color: '#A78BFA' },
  disgust:   { label: '불쾌', emoji: '🤢', color: '#84CC16' },
  contempt:  { label: '경멸', emoji: '😒', color: '#94A3B8' },
};

export const DEFAULT_EMOTION = 'neutral';

export function sortedEmotions(emotionCounts = {}) {
  return Object.entries(emotionCounts)
    .map(([key, count]) => ({ key, count, ...(EMOTION_META[key] || EMOTION_META.neutral) }))
    .sort((a, b) => b.count - a.count);
}
