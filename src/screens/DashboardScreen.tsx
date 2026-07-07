/**
 * Màn hình tab Home (Dashboard) — Tầng 1 (giao diện).
 * Hiển thị: chỉ số nhanh, biểu đồ 7 ngày, buổi tập, sức khỏe hôm nay, huy hiệu.
 * Không gọi database trực tiếp — luôn qua dashboardService, badgeService, notificationService.
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
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import GlassCard from '../components/ui/GlassCard';
import SectionHeader from '../components/ui/SectionHeader';
import { getDashboardSummary } from '../services/dashboardService';
import { syncUserBadges } from '../services/badgeService';
import {
  getNotificationPreferences,
  notifyBadgeEarned,
} from '../services/notificationService';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import type { BadgeWithStatus, DashboardSummary } from '../types';

type Props = {
  userId: string;
  refreshKey?: number;
  onNavigateToNutrition?: () => void;
  onNavigateToTraining?: () => void;
};

type StatItem = {
  key: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  wide?: boolean;
};

export default function DashboardScreen({
  userId,
  refreshKey = 0,
  onNavigateToNutrition,
  onNavigateToTraining,
}: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const handleScroll = useHideOnScroll();

  /**
   * Hàm trung tâm tải Dashboard: 3 request song song (summary, badge, prefs).
   * refreshKey (từ App.tsx) tăng sau khi hoàn thành buổi tập → useEffect gọi lại hàm này.
   * Lưu ý: lần load đầu previous badges = [] nên có thể bắn lại thông báo badge cũ.
   */
  const loadDashboard = useCallback(async () => {
    try {
      const [dashboard, badgeList, prefs] = await Promise.all([
        getDashboardSummary(userId),
        syncUserBadges(userId),
        getNotificationPreferences(userId).catch(() => null),
      ]);

      setSummary(dashboard);
      setBadges((previous) => {
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

  useEffect(() => {
    setLoading(true);
    void loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard, refreshKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

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
              onPress={() => setSettingsVisible(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="notifications-none" size={22} color={colors.onPrimaryFixed} />
            </TouchableOpacity>
          </View>
        </GlassCard>

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

        <SectionHeader title="Hoạt động 7 ngày" />
        <WeeklyProgressChart days={summary?.weekly_workouts ?? []} />

        <SectionHeader
          title="Buổi tập"
          actionLabel="Xem tất cả"
          onAction={onNavigateToTraining}
        />
        <TouchableOpacity activeOpacity={0.92} onPress={onNavigateToTraining}>
          <WorkoutCard />
        </TouchableOpacity>

        <SectionHeader
          title="Sức khỏe hôm nay"
          actionLabel="Chi tiết"
          onAction={onNavigateToNutrition}
        />
        <StatsGrid
          userId={userId}
          onNavigateToNutrition={onNavigateToNutrition}
          refreshKey={refreshKey}
          showStreak={false}
        />

        <SectionHeader
          title="Huy hiệu"
          subtitle={`${badges.filter((b) => b.earned).length}/${badges.length} đã mở khóa`}
        />
        <BadgeGrid badges={badges} />
      </ScrollView>

      <NotificationSettingsModal
        visible={settingsVisible}
        userId={userId}
        onClose={() => setSettingsVisible(false)}
        onUpdated={onRefresh}
      />
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
