import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus, RefreshCw, History } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - spacing.lg * 2 - CARD_GAP) / 2;

const PHOTOS = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400',
    uploader: '지은 (손녀)',
    emoji: '😊',
    date: '2024년 5월 12일',
    caption: '공원 나들이 정말 즐거웠어요!',
    aspect: 4 / 5,
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    uploader: '민수 (아들)',
    emoji: '🥰',
    date: '2024년 5월 10일',
    caption: '어머니가 좋아하시는 갈비찜',
    aspect: 4 / 5,
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400',
    uploader: '지은 (손녀)',
    emoji: '😊',
    date: '2024년 5월 8일',
    caption: '집 앞 꽃이 활짝 피었어요',
    aspect: 4 / 5,
  },
  {
    id: '4',
    uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    uploader: '현우 (사위)',
    emoji: '🌊',
    date: '2024년 5월 5일',
    caption: '오랜만의 바다 여행',
    aspect: 21 / 9,
    wide: true,
  },
  {
    id: '5',
    uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400',
    uploader: null,
    date: '추억: 1982년 봄',
    caption: '첫 가족 사진 찍던 날',
    aspect: 4 / 5,
    memory: true,
  },
];

export default function GalleryScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.toggleChip}>
            <Text style={styles.toggleText}>과거 사진 자동 재생</Text>
            <View style={styles.toggle}>
              <View style={styles.toggleDot} />
            </View>
          </View>
          <HapticButton hapticType="medium">
            <LinearGradient
              colors={[colors.primaryDark, colors.primaryContainer]}
              style={styles.uploadBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ImagePlus size={18} color={colors.white} />
              <Text style={styles.uploadText}>사진 올리기</Text>
            </LinearGradient>
          </HapticButton>
        </View>

        {/* Photo Grid */}
        <View style={styles.grid}>
          {PHOTOS.map((photo) => (
            <HapticButton
              key={photo.id}
              style={[
                styles.photoCard,
                photo.wide && styles.photoCardWide,
              ]}
            >
              <View
                style={[
                  styles.photoImageContainer,
                  {
                    aspectRatio: photo.aspect,
                  },
                ]}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {photo.uploader && (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>{photo.uploader}</Text>
                    <Text>{photo.emoji}</Text>
                  </View>
                )}
                {photo.memory && (
                  <View style={styles.memoryBadge}>
                    <History size={12} color={colors.white} />
                    <Text style={styles.memoryBadgeText}>추억의 조각</Text>
                  </View>
                )}
              </View>
              <View style={styles.photoInfo}>
                <Text style={styles.photoDate}>{photo.date}</Text>
                <Text style={styles.photoCaption}>{photo.caption}</Text>
              </View>
            </HapticButton>
          ))}
        </View>

        {/* Load More */}
        <HapticButton style={styles.loadMoreBtn}>
          <RefreshCw size={18} color={colors.secondary} />
          <Text style={styles.loadMoreText}>더 많은 사진 불러오기</Text>
        </HapticButton>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  toggleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  toggleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.onSurfaceVariant,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  photoCard: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  photoCardWide: {
    width: '100%',
  },
  photoImageContainer: {
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
    marginTop: 2,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  loadMoreText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
});
