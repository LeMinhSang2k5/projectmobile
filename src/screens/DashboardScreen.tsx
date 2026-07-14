/**
 * Man hinh tab Home (Dashboard) - Tang 1 giao dien.
 * Hien thi: hero chao user, chi so nhanh, bieu do 7 ngay, buoi tap, suc khoe, huy hieu.
 * Du lieu lay qua service (dashboardService, courseService, badgeService, notificationService).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, typography, radii } from '../theme/layout';
import WorkoutCard from '../components/WorkoutCard';
import StatsGrid from '../components/StatsGrid';
import WeeklyProgressChart from '../components/WeeklyProgressChart';
import BadgeGrid from '../components/BadgeGrid';
import GlassCard from '../components/ui/GlassCard';
import SectionHeader from '../components/ui/SectionHeader';
import { getDashboardSummary } from '../services/dashboardService';
import { getWorkoutCardSummary } from '../services/courseService';
import { syncUserBadges } from '../services/badgeService';
import {
  getNotificationPreferences,
  notifyBadgeEarned,
} from '../services/notificationService';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import type { BadgeWithStatus, DashboardSummary, WorkoutCardSummary } from '../types';

type Props = {
  userId: string;
  /** App.tsx tang sau khi hoan thanh buoi tap de reload du lieu Home */
  refreshKey?: number;
  /** Chuyen sang tab Nutrition khi bam "Chi tiet" */
  onNavigateToNutrition?: () => void;
  /** Chuyen sang tab Training khi bam the buoi tap hoac "Xem tat ca" */
  onNavigateToTraining?: () => void;
  /** Mo modal cai dat thong bao (tu nut chuong hoac bao thuc tap luyen) */
  onOpenNotificationSettings?: () => void;
};

/** Mot o trong luoi Chi so nhanh: streak, calo dot, buoi tap, ky luc */
type StatItem = {
  key: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  wide?: boolean;
};

/** Man hinh chinh tab Home - ghep cac section va dieu phoi tai du lieu */
export default function DashboardScreen({
  userId,
  refreshKey = 0,
  onNavigateToNutrition,
  onNavigateToTraining,
  onOpenNotificationSettings,
}: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workoutCard, setWorkoutCard] = useState<WorkoutCardSummary | null>(null);
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** An bottom tab khi scroll den cuoi danh sach */
  const handleScroll = useHideOnScroll();

  /**
   * Tai toan bo du lieu Home song song:
   * - summary: streak, calo, buoi tap, bieu do 7 ngay
   * - workoutSummary: khoa tap / chuong trinh gan nhat cho WorkoutCard
   * - badgeList: dong bo va cap huy hieu
   * - prefs: cai dat thong bao (de biet co gui alert badge moi khong)
   */
  const loadDashboard = useCallback(async () => {
    try {
      const [dashboard, workoutSummary, badgeList, prefs] = await Promise.all([
        getDashboardSummary(userId),
        getWorkoutCardSummary(userId),
        syncUserBadges(userId),
        getNotificationPreferences(userId).catch(() => null),
      ]);

      setSummary(dashboard);
      setWorkoutCard(workoutSummary);
      setBadges((previous) => {
        // Chi push thong bao khi user bat badge_notifications_enabled
        if (prefs?.badge_notifications_enabled) {
          const previousEarned = new Set(
            previous.filter((badge) => badge.earned).map((badge) => badge.id),
          );
          for (const badge of badgeList) {
            if (badge.earned && !previousEarned.has(badge.id)) {
              void notifyBadgeEarned(
                'Huy hiệu mới',
                `Bạn vừa mở khóa "${badge.title}"`,
              );
            }
          }
        }
        return badgeList;
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }, [userId]);

  /** Load lan dau va reload khi refreshKey doi (sau buoi tap) */
  useEffect(() => {
    setLoading(true);
    void loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard, refreshKey]);

  /** Keo xuong de refresh toan bo du lieu Home */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  /** Spinner chi hien lan load dau, chua co summary */
  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryFixed} />
        <Text style={styles.loadingText}>Đang tải tổng quan...</Text>
      </View>
    );
  }

  const displayName = summary?.display_name?.trim() || 'bạn';
  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  /** 4 chi so nhanh: streak, calo dot hom nay, so buoi tap, ky luc streak */
  const statItems: StatItem[] = [
    {
      key: 'streak',
      icon: 'local-fire-department',
      value: String(summary?.current_streak ?? 0),
      label: 'Streak ngày',
      wide: true,
    },
    {
      key: 'burn',
      icon: 'bolt',
      value: String(Math.round(summary?.calories_burned_today ?? 0)),
      label: 'Calo đốt',
    },
    {
      key: 'workouts',
      icon: 'fitness-center',
      value: String(summary?.workouts_today ?? 0),
      label: 'Buổi tập',
    },
    {
      key: 'record',
      icon: 'military-tech',
      value: String(summary?.longest_streak ?? 0),
      label: 'Kỷ lục',
      wide: true,
    },
  ];

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryFixed}
          />
        }
      >
        {/* Hero: ten user, ngay hom nay, nut mo cai dat thong bao */}
        <GlassCard variant="accent" style={styles.heroCard} padding={spacing.xl}>
          <View style={styles.heroAccent} />
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.heroOverline}>Tổng quan hôm nay</Text>
              <Text style={styles.heroTitle}>Chào {displayName}</Text>
              <Text style={styles.heroDate}>{todayLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.notifyButton}
              onPress={() => onOpenNotificationSettings?.()}
              activeOpacity={0.85}
            >
              <MaterialIcons name="notifications-none" size={22} color={colors.onPrimaryFixed} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Luoi 2 cot: streak + ky luc (wide), calo dot + buoi tap */}
        <SectionHeader title="Chỉ số nhanh" subtitle="Theo dõi tiến độ trong ngày" />
        <View style={styles.bentoGrid}>
          {statItems.map((item) => (
            <GlassCard
              key={item.key}
              style={[styles.statTile, item.wide && styles.statTileWide]}
              padding={spacing.lg}
            >
              {item.wide ? (
                <View style={styles.statRow}>
                  <View style={styles.statIconWrap}>
                    <MaterialIcons name={item.icon} size={20} color={colors.primaryFixed} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.statIconWrap}>
                    <MaterialIcons name={item.icon} size={18} color={colors.primaryFixed} />
                  </View>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </>
              )}
            </GlassCard>
          ))}
        </View>

        {/* Bieu do cot 7 ngay — du lieu tu summary.weekly_workouts */}
        <SectionHeader title="Hoạt động 7 ngày" />
        <WeeklyProgressChart days={summary?.weekly_workouts ?? []} />

        {/* WorkoutCard: khoa tap active hoac chuong trinh gan nhat */}
        <SectionHeader
          title="Buổi tập"
          actionLabel="Xem tất cả"
          onAction={onNavigateToTraining}
        />
        <TouchableOpacity activeOpacity={0.92} onPress={onNavigateToTraining}>
          <WorkoutCard data={workoutCard} loading={loading && !workoutCard} />
        </TouchableOpacity>

        {/* StatsGrid: tu tai nutrition + water hom nay */}
        <SectionHeader
          title="Sức khỏe hôm nay"
          actionLabel="Chi tiết"
          onAction={onNavigateToNutrition}
        />
        <StatsGrid
          userId={userId}
          onNavigateToNutrition={onNavigateToNutrition}
          onOpenNotificationSettings={onOpenNotificationSettings}
          refreshKey={refreshKey}
          showStreak={false}
        />

        {/* BadgeGrid: huy hieu da sync qua syncUserBadges */}
        <SectionHeader
          title="Huy hiệu"
          subtitle={`${badges.filter((b) => b.earned).length}/${badges.length} đã mở khóa`}
        />
        <BadgeGrid badges={badges} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xxl,
  },
  heroCard: {
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primaryFixed,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  heroOverline: {
    ...typography.overline,
    color: colors.primaryFixed,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.display,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  heroDate: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  notifyButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  statTile: {
    width: '47.5%',
  },
  statTileWide: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.metric,
    color: colors.onSurface,
  },
  statLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
