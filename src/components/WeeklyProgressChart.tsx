/**
 * Bieu do cot hoat dong 7 ngay tren Dashboard.
 * Input: summary.weekly_workouts (da chuan hoa 7 ngay).
 * Hien tong buoi tap, tong kcal va cot theo ngay.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/layout';
import GlassCard from './ui/GlassCard';
import { localDateDaysAgo, normalizeDateString, toLocalDateString } from '../lib/dateUtils';
import type { WeeklyWorkoutDay } from '../types';

type Props = {
  days: WeeklyWorkoutDay[];
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const CHART_HEIGHT = 96;

/** Chuyen date YYYY-MM-DD thanh nhan CN, T2, ... */
function dayLabel(dateText: string): string {
  const date = new Date(`${normalizeDateString(dateText)}T12:00:00`);
  return DAY_LABELS[date.getDay()];
}

/** Tao 7 ngay rong (workouts=0) khi input khong du 7 phan tu */
function buildFallbackDays(): WeeklyWorkoutDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: localDateDaysAgo(6 - index),
    workouts: 0,
    calories_burned: 0,
  }));
}

/** Ve bieu do cot 7 ngay + tong ket buoi tap / kcal */
export default function WeeklyProgressChart({ days }: Props) {
  const today = toLocalDateString();
  // Luon du 7 cot; fallback neu server tra ve sai do dai
  const chartDays = useMemo(
    () => (days.length === 7 ? days : buildFallbackDays()),
    [days],
  );

  const totalWorkouts = chartDays.reduce((sum, day) => sum + day.workouts, 0);
  const totalCalories = chartDays.reduce((sum, day) => sum + day.calories_burned, 0);
  // Toi thieu 1 de tranh chia cho 0 khi tinh chieu cao cot
  const maxWorkouts = Math.max(...chartDays.map((day) => day.workouts), 1);
  const hasActivity = totalWorkouts > 0;

  return (
    <GlassCard padding={spacing.xl}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryValue}>{totalWorkouts}</Text>
          <Text style={styles.summaryLabel}>buổi tập / 7 ngày</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={styles.summaryValue}>{Math.round(totalCalories)}</Text>
          <Text style={styles.summaryLabel}>kcal đốt cháy</Text>
        </View>
      </View>

      {!hasActivity ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="fitness-center" size={28} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Chưa có buổi tập nào</Text>
          <Text style={styles.emptySub}>
            Hoàn thành một chương trình tập để thấy biểu đồ cập nhật tại đây.
          </Text>
        </View>
      ) : null}

      <View style={styles.chartRow}>
        {chartDays.map((day) => {
          const isToday = normalizeDateString(day.date) === today;
          const active = day.workouts > 0;
          // Cot cao theo ty le workouts/maxWorkouts; ngay khong tap hien cham nho
          const fillHeight = active
            ? Math.max(12, (day.workouts / maxWorkouts) * CHART_HEIGHT)
            : 0;

          return (
            <View key={day.date} style={styles.barColumn}>
              <Text style={[styles.barValue, active && styles.barValueActive]}>
                {active ? day.workouts : '·'}
              </Text>
              <View style={[styles.barTrack, isToday && styles.barTrackToday]}>
                {active ? (
                  <View style={[styles.barFill, { height: fillHeight }]} />
                ) : (
                  <View style={styles.barEmpty} />
                )}
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                {dayLabel(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  summaryValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.glassBorder,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceElevated,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  emptySub: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: colors.outlineVariant,
    height: 16,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  barValueActive: {
    color: colors.primaryFixed,
  },
  barTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  barTrackToday: {
    borderColor: 'rgba(198, 243, 51, 0.45)',
    backgroundColor: colors.accentMuted,
  },
  barFill: {
    width: '100%',
    maxWidth: 22,
    borderRadius: 8,
    backgroundColor: colors.primaryFixed,
    minHeight: 12,
  },
  barEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
    marginBottom: 2,
  },
  barLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  barLabelToday: {
    color: colors.primaryFixed,
    fontFamily: 'Inter-Bold',
  },
});
