import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import GlassCard from './ui/GlassCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/layout';
import MacroChart, { CalorieRing } from './MacroChart';
import WaterTracker from './WaterTracker';
import { supabase } from '../../utils/supabase';
import { getProfile, getCalorieGoal, getWaterGoalMl } from '../services/healthService';
import { getDailyNutrition } from '../services/nutritionService';
import { getTodayWater, addWater, setWaterMl } from '../services/waterService';
import type { DailyNutrition, DailyWaterIntake, Profile } from '../types';
import { toLocalDateString } from '../lib/dateUtils';
import {
  getCalorieLimitStatus,
  getRemainingWaterMl,
} from '../lib/limitWarnings';

type Props = {
  userId: string;
  onNavigateToNutrition?: () => void;
  refreshKey?: number;
  showStreak?: boolean;
};

export default function StatsGrid({
  userId,
  onNavigateToNutrition,
  refreshKey = 0,
  showStreak = false,
}: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [water, setWater] = useState<DailyWaterIntake | null>(null);
  const [streak, setStreak] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const today = toLocalDateString();
      const prof = await getProfile(userId);
      setProfile(prof);
      const [nutritionData, waterData, streakResult] = await Promise.all([
        getDailyNutrition(userId, today),
        getTodayWater(userId, prof, today),
        showStreak
          ? supabase
              .from('user_streaks')
              .select('current_streak')
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      setNutrition(nutritionData);
      setWater(waterData);
      if (streakResult.data) setStreak(streakResult.data.current_streak);
    } catch (err) {
      console.error('StatsGrid fetch error:', err);
    }
  }, [userId, refreshKey, showStreak]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddWater = async (ml: number) => {
    const currentMl = water?.water_ml ?? 0;
    const goalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
    const remainingMl = getRemainingWaterMl(currentMl, goalMl);

    if (remainingMl <= 0) {
      Alert.alert(
        'Đã đủ mục tiêu',
        'Bạn đã đạt hoặc vượt mục tiêu nước hôm nay. Mở tab Dinh dưỡng để điều chỉnh.',
      );
      return;
    }

    const amountToAdd = Math.min(ml, remainingMl);
    const add = async (amount: number) => {
      try {
        const updated = await addWater(userId, amount, profile, toLocalDateString());
        setWater(updated);
      } catch (err) {
        console.error('Add water error:', err);
      }
    };

    if (amountToAdd < ml) {
      Alert.alert(
        'Điều chỉnh lượng nước',
        `Chỉ còn ${remainingMl}ml đến mục tiêu. Bạn muốn thêm ${amountToAdd}ml cho vừa mục tiêu?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: `Thêm ${amountToAdd}ml`, onPress: () => void add(amountToAdd) },
        ],
      );
      return;
    }

    await add(amountToAdd);
  };

  const handleSetWaterToGoal = async () => {
    const goalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
    try {
      const updated = await setWaterMl(userId, goalMl, profile, toLocalDateString());
      setWater(updated);
    } catch (err) {
      console.error('Set water goal error:', err);
    }
  };

  const calorieGoal = getCalorieGoal(profile);
  const caloriesConsumed = nutrition?.calories_consumed ?? 0;
  const waterMl = water?.water_ml ?? 0;
  const waterGoalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
  const wakeupTime = profile?.wakeup_time ?? '06:30';
  const calorieLimit = getCalorieLimitStatus(caloriesConsumed, calorieGoal);

  return (
    <View style={styles.container}>
      {showStreak ? (
        <GlassCard variant="accent" style={styles.streakCard} padding={spacing.xl}>
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>CHUỖI NGÀY TẬP</Text>
            <Text style={styles.streakValue}>{streak} Ngày</Text>
          </View>
          <MaterialIcons name="local-fire-department" size={40} color={colors.primaryFixed} />
        </GlassCard>
      ) : null}

      <GlassCard padding={spacing.xl}>
        <View style={styles.alarmRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="alarm" size={24} color={colors.primaryFixed} />
          </View>
          <View style={styles.alarmTextContainer}>
            <Text style={styles.alarmLabel}>BÁO THỨC TẬP LUYỆN</Text>
            <Text style={styles.alarmTime}>{wakeupTime}</Text>
            <Text style={styles.alarmSub}>Cài đặt trong Profile</Text>
          </View>
        </View>
      </GlassCard>

      <TouchableOpacity activeOpacity={0.85} onPress={onNavigateToNutrition}>
        <GlassCard style={styles.foodCard} padding={spacing.xl}>
          <CalorieRing value={caloriesConsumed} maxValue={calorieGoal} />
          <View style={styles.foodDetails}>
            <Text style={styles.foodTitle}>DINH DƯỠNG</Text>
            <View style={styles.foodRow}>
              <Text style={styles.foodRowLabel}>Mục tiêu</Text>
              <Text style={styles.foodRowValue}>{calorieGoal}</Text>
            </View>
            <View style={styles.foodRow}>
              <Text style={styles.foodRowLabel}>Đã nạp</Text>
              <Text style={[styles.foodRowValue, { color: colors.primaryFixed }]}>{caloriesConsumed}</Text>
            </View>
            <View style={styles.foodRow}>
              <Text style={styles.foodRowLabel}>Còn lại</Text>
              <Text style={styles.foodRowValue}>
                {calorieLimit.isOver
                  ? `Vượt ${calorieLimit.excess}`
                  : Math.max(0, calorieGoal - caloriesConsumed)}
              </Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.85} onPress={onNavigateToNutrition}>
        <WaterTracker
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
          onAddWater={handleAddWater}
          onSetWaterToGoal={handleSetWaterToGoal}
          compact
        />
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.85} onPress={onNavigateToNutrition}>
        <GlassCard padding={spacing.lg}>
          <MacroChart
            protein={nutrition?.protein_g ?? 0}
            carbs={nutrition?.carbs_g ?? 0}
            fat={nutrition?.fat_g ?? 0}
          />
          <Text style={styles.macroLinkText}>Xem chi tiết dinh dưỡng</Text>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  streakValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    color: colors.onSurface,
    marginTop: 4,
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmTextContainer: {
    flex: 1,
  },
  alarmLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  alarmTime: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  alarmSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primaryFixed,
    marginTop: 4,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  foodDetails: {
    flex: 1,
  },
  foodTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  foodRowLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  foodRowValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  foodRowValueOver: {
    color: '#ff6b6b',
  },
  macroLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.primaryFixed,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
