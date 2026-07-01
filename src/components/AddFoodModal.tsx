import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { searchFoods, addMealItem } from '../services/nutritionService';
import type { Food, MealType } from '../types';
import { MEAL_TYPE_LABELS } from '../types';
import {
  getCalorieOverExcessAtQuantity,
  getFoodCaloriesAtQuantity,
  getMaxFoodQuantityWithinCalorieLimit,
  getRemainingCalories,
  isFoodQuantityOverCalorieLimit,
} from '../lib/limitWarnings';

const QUANTITY_OPTIONS = [0.5, 1, 1.5, 2];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

type Props = {
  visible: boolean;
  userId: string;
  date: string;
  defaultMealType?: MealType;
  currentCalories?: number;
  calorieGoal?: number;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddFoodModal({
  visible,
  userId,
  date,
  defaultMealType = 'breakfast',
  currentCalories = 0,
  calorieGoal = 2100,
  onClose,
  onAdded,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMealType(defaultMealType);
      setSelectedFood(null);
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [visible, defaultMealType]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const foods = await searchFoods(query);
        setResults(foods);
      } catch {
        setError('Không thể tìm kiếm món ăn');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const performAdd = useCallback(async () => {
    if (!selectedFood) return;
    setSaving(true);
    setError(null);
    try {
      await addMealItem(userId, date, mealType, selectedFood.id, quantity);
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Không thể thêm món ăn');
    } finally {
      setSaving(false);
    }
  }, [selectedFood, userId, date, mealType, quantity, onAdded, onClose]);

  const handleAdd = useCallback(async () => {
    if (!selectedFood) return;
    if (
      isFoodQuantityOverCalorieLimit(
        selectedFood.calories,
        quantity,
        currentCalories,
        calorieGoal,
      )
    ) {
      return;
    }
    await performAdd();
  }, [selectedFood, quantity, currentCalories, calorieGoal, performAdd]);

  const remainingCalories = getRemainingCalories(currentCalories, calorieGoal);
  const selectedCalories = selectedFood
    ? getFoodCaloriesAtQuantity(selectedFood.calories, quantity)
    : 0;
  const isOverSelection = selectedFood
    ? isFoodQuantityOverCalorieLimit(
        selectedFood.calories,
        quantity,
        currentCalories,
        calorieGoal,
      )
    : false;
  const overExcess = selectedFood
    ? getCalorieOverExcessAtQuantity(
        selectedFood.calories,
        quantity,
        currentCalories,
        calorieGoal,
      )
    : 0;
  const suggestedQuantity = selectedFood
    ? getMaxFoodQuantityWithinCalorieLimit(
        selectedFood.calories,
        currentCalories,
        calorieGoal,
        QUANTITY_OPTIONS,
      )
    : null;
  const suggestedCalories =
    selectedFood && suggestedQuantity != null
      ? getFoodCaloriesAtQuantity(selectedFood.calories, suggestedQuantity)
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Thêm món ăn</Text>

            <Text style={styles.label}>Bữa ăn</Text>
            <View style={styles.mealRow}>
              {MEAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealChip, mealType === type && styles.mealChipActive]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={[styles.mealChipText, mealType === type && styles.mealChipTextActive]}>
                    {MEAL_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tìm món</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên món ăn..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={query}
              onChangeText={setQuery}
            />

            {loading ? (
              <ActivityIndicator color={colors.primaryFixed} style={{ marginVertical: 16 }} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  query.trim() ? (
                    <Text style={styles.emptyText}>Không tìm thấy món phù hợp</Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.foodRow, selectedFood?.id === item.id && styles.foodRowSelected]}
                    onPress={() => setSelectedFood(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <Text style={styles.foodMeta}>
                        {item.calories} kcal · {item.serving_size}
                      </Text>
                    </View>
                    {selectedFood?.id === item.id && (
                      <MaterialIcons name="check-circle" size={22} color={colors.primaryFixed} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            {selectedFood && (
              <>
                <Text style={styles.label}>Khẩu phần</Text>
                <View style={styles.mealRow}>
                  {QUANTITY_OPTIONS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.mealChip, quantity === q && styles.mealChipActive]}
                      onPress={() => setQuantity(q)}
                    >
                      <Text style={[styles.mealChipText, quantity === q && styles.mealChipTextActive]}>
                        {q}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.caloriePreview}>
                  {selectedCalories} kcal · Còn {remainingCalories} kcal trong ngày
                </Text>
                {isOverSelection ? (
                  <View style={styles.adjustHint}>
                    <MaterialIcons name="info-outline" size={18} color={colors.primaryFixed} />
                    <View style={styles.adjustHintText}>
                      <Text style={styles.adjustHintMessage}>
                        Khẩu phần {quantity}x sẽ vượt mục tiêu {overExcess} kcal. Hãy giảm khẩu phần
                        hoặc chọn gợi ý bên dưới.
                      </Text>
                      {suggestedQuantity != null ? (
                        <TouchableOpacity
                          style={styles.adjustBtn}
                          onPress={() => setQuantity(suggestedQuantity)}
                        >
                          <Text style={styles.adjustBtnText}>
                            Dùng {suggestedQuantity}x ({suggestedCalories} kcal)
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.adjustHintSub}>
                          Không còn khẩu phần phù hợp — hãy xóa bớt món trong nhật ký.
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}
              </>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.addBtn,
                (!selectedFood || saving || isOverSelection) && styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!selectedFood || saving || isOverSelection}
            >
              {saving ? (
                <ActivityIndicator color={colors.onPrimaryFixed} />
              ) : (
                <Text style={styles.addBtnText}>Thêm vào nhật ký</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  keyboardView: { width: '100%' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  mealChipActive: {
    backgroundColor: colors.primaryFixed,
  },
  mealChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  mealChipTextActive: {
    color: colors.onPrimaryFixed,
    fontFamily: 'Inter-Bold',
  },
  list: {
    maxHeight: 180,
    marginVertical: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  foodRowSelected: {
    backgroundColor: 'rgba(198, 243, 51, 0.08)',
  },
  foodName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  foodMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#ff6b6b',
    marginTop: 8,
  },
  caloriePreview: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 4,
  },
  adjustHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(198, 243, 51, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(198, 243, 51, 0.22)',
  },
  adjustHintText: {
    flex: 1,
    gap: 8,
  },
  adjustHintMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  adjustHintSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  adjustBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adjustBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.onPrimaryFixed,
  },
  addBtn: {
    backgroundColor: colors.primaryFixed,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.onPrimaryFixed,
  },
});
