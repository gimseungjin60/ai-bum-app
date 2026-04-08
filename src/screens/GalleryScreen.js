import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, RefreshCw, History, Loader } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import { useCollection } from '../hooks/useFirestore';
import { uploadPhotoWithNotification } from '../services/photoService';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - spacing.lg * 2 - CARD_GAP) / 2;

const MOCK_PHOTOS = [
  {
    id: 'mock1',
    uri: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400',
    uploaderName: '지은 (손녀)',
    emoji: '😊',
    caption: '공원 나들이 정말 즐거웠어요!',
  },
  {
    id: 'mock2',
    uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    uploaderName: '민수 (아들)',
    emoji: '🥰',
    caption: '어머니가 좋아하시는 갈비찜',
  },
];

function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function GalleryScreen() {
  const [uploading, setUploading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Firestore에서 사진 목록 구독
  const { data: firestorePhotos, loading } = useCollection('photos', 'createdAt', 50);
  const photos = firestorePhotos.length > 0 ? firestorePhotos : MOCK_PHOTOS;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleUpload = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 업로드하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    // 사진 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    // 캡션 입력 (간단한 Alert prompt)
    Alert.prompt
      ? Alert.prompt(
          '사진 설명',
          '어르신께 보여줄 사진 설명을 입력하세요',
          async (caption) => {
            await doUpload(result.assets[0].uri, caption);
          },
          'plain-text',
          '',
          'default'
        )
      : await doUpload(result.assets[0].uri, '');
  };

  const doUpload = async (uri, caption) => {
    setUploading(true);
    try {
      await uploadPhotoWithNotification(uri, {
        uploaderName: '가족',
        caption: caption || '소중한 순간',
        emoji: '😊',
      });
      Alert.alert('업로드 완료', '사진이 어르신의 스마트 프레임에 전송됩니다!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('업로드 실패', '다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 소중한 순간</Text>
          <Text style={styles.subtitle}>
            가족들과 함께 나누는 따뜻한 기억들
          </Text>
        </View>

        {/* Upload Button */}
        <View style={styles.controls}>
          <HapticButton hapticType="medium" onPress={handleUpload}>
            <LinearGradient
              colors={[colors.primaryDark, colors.primaryContainer]}
              style={styles.uploadBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <ImagePlus size={18} color={colors.white} />
              )}
              <Text style={styles.uploadText}>
                {uploading ? '업로드 중...' : '사진 올리기'}
              </Text>
            </LinearGradient>
          </HapticButton>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Photo Grid */}
        <View style={styles.grid}>
          {photos.map((photo) => (
            <HapticButton key={photo.id} style={styles.photoCard}>
              <View style={styles.photoImageContainer}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {(photo.uploaderName || photo.uploader) && (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>
                      {photo.uploaderName || photo.uploader}
                    </Text>
                    <Text>{photo.emoji || '😊'}</Text>
                  </View>
                )}
                {photo.isMemory && (
                  <View style={styles.memoryBadge}>
                    <History size={12} color={colors.white} />
                    <Text style={styles.memoryBadgeText}>추억의 조각</Text>
                  </View>
                )}
              </View>
              <View style={styles.photoInfo}>
                <Text style={styles.photoDate}>
                  {formatDate(photo.createdAt) || photo.date || ''}
                </Text>
                <Text style={styles.photoCaption} numberOfLines={2}>
                  {photo.caption}
                </Text>
              </View>
            </HapticButton>
          ))}
        </View>

        {photos.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <ImagePlus size={48} color={colors.stone400} />
            <Text style={styles.emptyText}>
              아직 사진이 없습니다{'\n'}첫 번째 사진을 올려보세요!
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  header: { marginBottom: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xl,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  uploadText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  photoCard: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  photoImageContainer: {
    aspectRatio: 1,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  photoBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  memoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  memoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  photoInfo: { paddingHorizontal: 4, marginTop: 8 },
  photoDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.onSurfaceVariant,
  },
  photoCaption: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.stone400,
    textAlign: 'center',
    lineHeight: 24,
  },
});
