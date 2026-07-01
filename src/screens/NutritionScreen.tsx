import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import MacroChart, { CalorieRing } from '../components/MacroChart';
import WaterTracker from '../components/WaterTracker';
import MealSection from '../components/MealSection';
import AddFoodModal from '../components/AddFoodModal';
import {
  getMealsByDate,
  getDailyNutrition,
  removeMealItem,
  addMealItem,
  getSuggestedMeals,
} from '../services/nutritionService';
import {
  getProfile,
  recalculateAndSave,
  getCalorieGoal,
  getMacroGoals,
  getWaterGoalMl,
} from '../services/healthService';
import { getTodayWater, addWater, setWaterMl } from '../services/waterService';
import {
  enableWaterReminders,
  disableWaterReminders,
  isExpoGoEnvironment,
} from '../services/waterReminderService';
import type {
  DailyNutrition,
  DailyWaterIntake,
  MealItem,
  MealType,
  Profile,
  SuggestedMeals,
} from '../types';
import { hasCompleteHealthProfile as checkHealth } from '../lib/healthCalculations';
import { toLocalDateString } from '../lib/dateUtils';
import LimitAdjustHint from '../components/LimitAdjustHint';
import {
  getCalorieLimitStatus,
  getMacroLimitItems,
  getOverMacroLabels,
  getRemainingWaterMl,
} from '../lib/limitWarnings';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

type Props = {
  userId: string;
};

export default function NutritionScreen({ userId }: Props) {
  const today = toLocalDateString();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [water, setWater] = useState<DailyWaterIntake | null>(null);
  const [mealsByType, setMealsByType] = useState<Record<MealType, MealItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [defaultMealType, setDefaultMealType] = useState<MealType>('breakfast');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedMeals>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [applyingMeal, setApplyingMeal] = useState<MealType | null>(null);
  const [macroHintDismissed, setMacroHintDismissed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mealJournalY = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      let prof = await getProfile(userId);
      if (prof && checkHealth(prof)) {
        prof = (await recalculateAndSave(userId)) ?? prof;
      }
      setProfile(prof);
      setReminderEnabled(prof?.water_reminder_enabled ?? false);

      const [nutritionData, waterData, meals] = await Promise.all([
        getDailyNutrition(userId, today),
        getTodayWater(userId, prof, today),
        getMealsByDate(userId, today),
      ]);

      setNutrition(nutritionData);
      setWater(waterData);

      const grouped: Record<MealType, MealItem[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      };
      for (const meal of meals) {
        grouped[meal.meal_type] = meal.meal_items ?? [];
      }
      setMealsByType(grouped);

      const mealSuggestions = await getSuggestedMeals(getCalorieGoal(prof), today);
      setSuggestions(mealSuggestions);
    } catch (err) {
      console.error('Nutrition fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const macroGoalsForHint = getMacroGoals(profile);
  const overMacroCount = getOverMacroLabels(
    getMacroLimitItems(
      nutrition?.protein_g ?? 0,
      nutrition?.carbs_g ?? 0,
      nutrition?.fat_g ?? 0,
      macroGoalsForHint,
    ),
  ).length;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (overMacroCount === 0) {
      setMacroHintDismissed(false);
    }
  }, [overMacroCount]);

  const handleAddWater = async (ml: number) => {
    const currentMl = water?.water_ml ?? 0;
    const goalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
    const remainingMl = getRemainingWaterMl(currentMl, goalMl);

    if (remainingMl <= 0) {
      Alert.alert(
        'Đã đủ mục tiêu',
        'Bạn đã đạt hoặc vượt mục tiêu nước hôm nay. Dùng "Đặt về mục tiêu" nếu muốn điều chỉnh lại.',
      );
      return;
    }

    const amountToAdd = Math.min(ml, remainingMl);
    if (amountToAdd < ml) {
      Alert.alert(
        'Điều chỉnh lượng nước',
        `Chỉ còn ${remainingMl}ml đến mục tiêu. Bạn muốn thêm ${amountToAdd}ml cho vừa mục tiêu?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: `Thêm ${amountToAdd}ml`,
            onPress: () => void (async () => {
              try {
                const updated = await addWater(userId, amountToAdd, profile, today);
                setWater(updated);
              } catch (err: any) {
                Alert.alert('Lỗi', err.message ?? 'Không thể cập nhật nước');
              }
            })(),
          },
        ],
      );
      return;
    }

    try {
      const updated = await addWater(userId, amountToAdd, profile, today);
      setWater(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể cập nhật nước');
    }
  };

  const handleSetWaterToGoal = async () => {
    const goalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
    try {
      const updated = await setWaterMl(userId, goalMl, profile, today);
      setWater(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể điều chỉnh nước');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeMealItem(userId, itemId, today);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể xóa món');
    }
  };

  const handleToggleReminder = async (value: boolean) => {
    try {
      if (value) {
        await enableWaterReminders(userId);
        if (isExpoGoEnvironment()) {
          Alert.alert(
            'Đã bật nhắc uống nước',
            'Expo Go dùng chế độ nhắc trong app. Thông báo sẽ hiện khi bạn mở app vào các khung giờ 7h, 9h, 11h, 13h, 15h, 17h, 19h, 21h.',
          );
        }
      } else {
        await disableWaterReminders(userId);
      }
      setReminderEnabled(value);
      setProfile((p) => (p ? { ...p, water_reminder_enabled: value } : p));
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể cập nhật nhắc nhở');
    }
  };

  const openAddModal = (mealType: MealType) => {
    setDefaultMealType(mealType);
    setAddModalVisible(true);
  };

  const handleApplySuggestedMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealSuggestions = suggestions[mealType];
    if (mealSuggestions.length === 0) {
      Alert.alert('Chưa có gợi ý', 'Hiện chưa có món phù hợp cho bữa này.');
      return;
    }

    try {
      setApplyingMeal(mealType);
      for (const item of mealSuggestions) {
        await addMealItem(userId, today, mealType, item.food.id, item.quantity);
      }
      Alert.alert('Đã thêm', `Đã thêm thực đơn gợi ý cho bữa ${mealType === 'breakfast' ? 'sáng' : mealType === 'lunch' ? 'trưa' : 'tối'}.`);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể áp dụng gợi ý bữa ăn');
    } finally {
      setApplyingMeal(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primaryFixed} />
      </View>
    );
  }

  const calorieGoal = getCalorieGoal(profile);
  const macroGoals = getMacroGoals(profile);
  const caloriesConsumed = nutrition?.calories_consumed ?? 0;
  const waterMl = water?.water_ml ?? 0;
  const waterGoalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
  const profileComplete = profile ? checkHealth(profile) : false;
  const calorieLimit = getCalorieLimitStatus(caloriesConsumed, calorieGoal);
  const macroLimits = getMacroLimitItems(
    nutrition?.protein_g ?? 0,
    nutrition?.carbs_g ?? 0,
    nutrition?.fat_g ?? 0,
    macroGoals,
  );
  const overMacros = getOverMacroLabels(macroLimits);
  const suggestedTotalCalories = (['breakfast', 'lunch', 'dinner'] as const).reduce(
    (sum, mealType) =>
      sum + suggestions[mealType].reduce((mealSum, item) => mealSum + item.estimatedCalories, 0),
    0,
  );

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.primaryFixed}
          />
        }
      >
        <Text style={styles.screenTitle}>Dinh Dưỡng</Text>
        <Text style={styles.screenSub}>Nhật ký ăn uống hôm nay</Text>

        {!profileComplete && (
          <View style={styles.banner}>
            <MaterialIcons name="info-outline" size={20} color={colors.primaryFixed} />
            <Text style={styles.bannerText}>
              Hoàn thành hồ sơ (cân nặng, chiều cao, giới tính) để tính mục tiêu dinh dưỡng chính xác.
            </Text>
          </View>
        )}

        {calorieLimit.isOver && (
          <LimitAdjustHint
            message={`Bạn đang vượt ${calorieLimit.excess} kcal so với mục tiêu. Xóa bớt món trong nhật ký để về đúng quy định.`}
            actionLabel="Xem nhật ký bữa ăn"
            onAction={() => scrollRef.current?.scrollTo({ y: mealJournalY.current, animated: true })}
          />
        )}

        {overMacros.length > 0 && !macroHintDismissed && (
          <LimitAdjustHint
            message={`Macro đang vượt: ${overMacros.join(', ')}. Hãy xóa hoặc giảm khẩu phần món phù hợp.`}
            actionLabel="Xem nhật ký bữa ăn"
            onAction={() => scrollRef.current?.scrollTo({ y: mealJournalY.current, animated: true })}
            onDismiss={() => setMacroHintDismissed(true)}
          />
        )}

        <View style={styles.summaryCard}>
          <CalorieRing value={caloriesConsumed} maxValue={calorieGoal} />
          <View style={styles.summaryDetails}>
            <Text style={styles.summaryTitle}>TỔNG CALO</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mục tiêu</Text>
              <Text style={styles.summaryValue}>{calorieGoal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Đã nạp</Text>
              <Text style={[styles.summaryValue, { color: colors.primaryFixed }]}>{caloriesConsumed}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Còn lại</Text>
              <Text style={styles.summaryValue}>
                {calorieLimit.isOver
                  ? `Vượt ${calorieLimit.excess} kcal`
                  : Math.max(0, calorieGoal - caloriesConsumed)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Macronutrients</Text>
        <View style={styles.card}>
          <MacroChart
            protein={nutrition?.protein_g ?? 0}
            carbs={nutrition?.carbs_g ?? 0}
            fat={nutrition?.fat_g ?? 0}
            proteinGoal={macroGoals.protein_g}
            carbsGoal={macroGoals.carbs_g}
            fatGoal={macroGoals.fat_g}
          />
        </View>

        <Text style={styles.sectionTitle}>Gợi ý thực đơn 3 bữa</Text>
        <Text style={styles.suggestionSubtitle}>
          Tổng ~{suggestedTotalCalories} / {calorieGoal} kcal · Thực đơn đổi mỗi ngày
        </Text>
        {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
          <View key={mealType} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>
                Bữa {mealType === 'breakfast' ? 'Sáng' : mealType === 'lunch' ? 'Trưa' : 'Tối'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.suggestionApplyBtn,
                  applyingMeal === mealType && styles.suggestionApplyBtnDisabled,
                ]}
                disabled={applyingMeal === mealType}
                onPress={() => handleApplySuggestedMeal(mealType)}
              >
                {applyingMeal === mealType ? (
                  <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                ) : (
                  <>
                    <MaterialIcons name="playlist-add-check" size={16} color={colors.onPrimaryFixed} />
                    <Text style={styles.suggestionApplyText}>Áp dụng bữa</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {suggestions[mealType].length === 0 ? (
              <Text style={styles.suggestionEmpty}>Chưa có dữ liệu món ăn để gợi ý.</Text>
            ) : (
              suggestions[mealType].map((item) => (
                <View key={`${mealType}-${item.food.id}`} style={styles.suggestionItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionFoodName}>{item.food.name}</Text>
                    <Text style={styles.suggestionFoodMeta}>
                      {item.quantity}x · {item.estimatedCalories} kcal · {item.food.serving_size}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ))}

        <View
          style={styles.sectionHeader}
          onLayout={(event) => {
            mealJournalY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>Nhật ký bữa ăn</Text>
          <TouchableOpacity style={styles.addFoodBtn} onPress={() => openAddModal('breakfast')}>
            <MaterialIcons name="restaurant" size={18} color={colors.onPrimaryFixed} />
            <Text style={styles.addFoodBtnText}>Thêm món</Text>
          </TouchableOpacity>
        </View>

        {MEAL_TYPES.map((type) => (
          <MealSection
            key={type}
            mealType={type}
            items={mealsByType[type]}
            onAddPress={openAddModal}
            onRemoveItem={handleRemoveItem}
          />
        ))}

        <Text style={styles.sectionTitle}>Nước uống</Text>
        <WaterTracker
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
          onAddWater={handleAddWater}
          onSetWaterToGoal={handleSetWaterToGoal}
        />

        <View style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Nhắc uống nước</Text>
            <Text style={styles.reminderSub}>
              {isExpoGoEnvironment()
                ? 'Expo Go: nhắc trong app mỗi 2h (7:00 – 21:00)'
                : 'Mỗi 2 giờ từ 7:00 – 22:00'}
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
            thumbColor={colors.onSurface}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddFoodModal
        visible={addModalVisible}
        userId={userId}
        date={today}
        defaultMealType={defaultMealType}
        currentCalories={caloriesConsumed}
        calorieGoal={calorieGoal}
        onClose={() => setAddModalVisible(false)}
        onAdded={fetchData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  screenTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 26,
    color: colors.onSurface,
  },
  screenSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 20,
    marginTop: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(198, 243, 51, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 243, 51, 0.25)',
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryCardOver: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  summaryDetails: { flex: 1 },
  summaryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.onSurface,
  },
  summaryValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  summaryValueOver: {
    color: '#ff6b6b',
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
  },
  suggestionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: -4,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  addFoodBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: colors.onPrimaryFixed,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  reminderTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  reminderSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  suggestionCard: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  suggestionApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestionApplyBtnDisabled: {
    opacity: 0.7,
  },
  suggestionApplyText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: colors.onPrimaryFixed,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  suggestionFoodName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  suggestionFoodMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  suggestionEmpty: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});
