/**
 * The buoi tap tren Dashboard.
 * Nhan du lieu tu courseService (khoa tap active hoac chuong trinh gan nhat).
 * 3 trang thai: loading, empty, hien thi day du.
 */
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { WorkoutCardSummary } from '../types';

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';

type Props = {
  /** Du lieu khoa tap / chuong trinh; null = chua co buoi tap */
  data: WorkoutCardSummary | null;
  /** true khi dang goi API lan dau */
  loading?: boolean;
};

/** Hien thi the buoi tap: loading, empty, hoac noi dung that */
export default function WorkoutCard({ data, loading = false }: Props) {
  if (loading) {
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <ActivityIndicator size="small" color={colors.primaryFixed} />
        <Text style={styles.stateText}>Đang tải buổi tập...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <MaterialIcons name="fitness-center" size={32} color={colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>Chưa có buổi tập nào</Text>
        <Text style={styles.stateText}>Chọn một chương trình tập để bắt đầu hành trình của bạn.</Text>
      </View>
    );
  }

  const progressWidth =
    data.progressPercent != null
      ? (`${data.progressPercent}%` as DimensionValue)
      : undefined;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: data.thumbnailUrl ?? DEFAULT_THUMBNAIL }}
        style={styles.imageBackground}
        imageStyle={{ opacity: 0.5 }}
      >
        <LinearGradient
          colors={['rgba(26,28,28,0.2)', 'rgba(18,20,20,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.topSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>KHÓA TẬP HIỆN TẠI</Text>
            </View>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.subtitle}>{data.subtitle}</Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.progressTextRow}>
              {data.progressPercent != null ? (
                <Text style={styles.progressTextHighlight}>{data.progressPercent}% Hoàn thành</Text>
              ) : (
                <Text style={styles.progressTextHighlight}>
                  {data.sessionsCompleted} buổi đã tập
                </Text>
              )}
              {data.remainingLabel ? (
                <Text style={styles.progressTextSub}>{data.remainingLabel}</Text>
              ) : null}
            </View>
            {data.progressPercent != null ? (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: progressWidth }]} />
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  stateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.onSurface,
    marginTop: 4,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  topSection: {},
  badge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: colors.onPrimaryContainer,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  bottomSection: {},
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressTextHighlight: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.primaryFixed,
  },
  progressTextSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryFixed,
    borderRadius: 999,
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
});
