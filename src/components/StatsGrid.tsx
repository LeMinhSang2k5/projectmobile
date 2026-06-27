import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import MacroChart, { CalorieRing } from './MacroChart';
import WaterTracker from './WaterTracker';
import { getProfile, getCalorieGoal, getWaterGoalMl } from '../services/healthService';
import { getDailyNutrition } from '../services/nutritionService';
import { getTodayWater, addWater } from '../services/waterService';
import type { DailyNutrition, DailyWaterIntake, Profile } from '../types';

type Props = {
  userId: string;
  onNavigateToNutrition?: () => void;
};

const today = new Date().toISOString().split('T')[0];

export default function StatsGrid({ userId, onNavigateToNutrition }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [water, setWater] = useState<DailyWaterIntake | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const prof = await getProfile(userId);
      setProfile(prof);
      const [nutritionData, waterData] = await Promise.all([
        getDailyNutrition(userId, today),
        getTodayWater(userId, prof, today),
      ]);
      setNutrition(nutritionData);
      setWater(waterData);
    } catch (err) {
      console.error('StatsGrid fetch error:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddWater = async (ml: number) => {
    try {
      const updated = await addWater(userId, ml, profile, today);
      setWater(updated);
    } catch (err) {
      console.error('Add water error:', err);
    }
  };

  const calorieGoal = getCalorieGoal(profile);
  const caloriesConsumed = nutrition?.calories_consumed ?? 0;
  const waterMl = water?.water_ml ?? 0;
  const waterGoalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
  const wakeupTime = profile?.wakeup_time ?? '06:30';

  return (
    <View style={styles.container}>
      <View style={[styles.card, styles.alarmCard]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="alarm" size={28} color={colors.primaryFixed} />
        </View>
        <View style={styles.alarmTextContainer}>
          <Text style={styles.alarmLabel}>BÁO THỨC TẬP LUYỆN</Text>
          <Text style={styles.alarmTime}>{wakeupTime}</Text>
          <Text style={styles.alarmSub}>Cài đặt trong Profile</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.card, styles.foodCard]}
        activeOpacity={0.85}
        onPress={onNavigateToNutrition}
      >
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
            <Text style={styles.foodRowValue}>{Math.max(0, calorieGoal - caloriesConsumed)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.85} onPress={onNavigateToNutrition}>
        <WaterTracker
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
          onAddWater={handleAddWater}
          compact
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.macroLink} onPress={onNavigateToNutrition}>
        <MacroChart
          protein={nutrition?.protein_g ?? 0}
          carbs={nutrition?.carbs_g ?? 0}
          fat={nutrition?.fat_g ?? 0}
        />
        <Text style={styles.macroLinkText}>Xem chi tiết dinh dưỡng →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  alarmCard: {
    alignItems: 'center',
    gap: 12,
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
    alignItems: 'center',
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
    gap: 20,
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
  macroLink: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  macroLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.primaryFixed,
    textAlign: 'center',
    marginTop: 12,
  },
});
