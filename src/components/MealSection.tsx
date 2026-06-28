import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { MealItem, MealType } from '../types';
import { MEAL_TYPE_LABELS } from '../types';

type Props = {
  mealType: MealType;
  items: MealItem[];
  onAddPress: (mealType: MealType) => void;
  onRemoveItem: (itemId: string) => void;
};

export default function MealSection({
  mealType,
  items,
  onAddPress,
  onRemoveItem,
}: Props) {
  const mealCalories = items.reduce((sum, item) => sum + (item.calories ?? 0), 0);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{MEAL_TYPE_LABELS[mealType]}</Text>
          <Text style={styles.subtitle}>{mealCalories} kcal</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => onAddPress(mealType)}>
          <MaterialIcons name="add" size={20} color={colors.primaryFixed} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>Chưa có món nào</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>
                {(item.foods as any)?.name ?? 'Món ăn'}
              </Text>
              <Text style={styles.itemMeta}>
                {item.quantity}x · {item.calories} kcal
              </Text>
            </View>
            <TouchableOpacity onPress={() => onRemoveItem(item.id)} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.primaryFixed,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  itemName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  itemMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
