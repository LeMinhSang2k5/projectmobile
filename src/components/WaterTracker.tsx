import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  waterMl: number;
  waterGoalMl: number;
  onAddWater: (ml: number) => void;
  compact?: boolean;
};

export default function WaterTracker({
  waterMl,
  waterGoalMl,
  onAddWater,
  compact = false,
}: Props) {
  const progress = waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0;
  const percent = Math.round(progress * 100);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>LƯỢNG NƯỚC</Text>
          <Text style={styles.count}>
            <Text style={styles.countHighlight}>{waterMl}</Text>
            <Text style={styles.countGoal}> / {waterGoalMl} ml</Text>
          </Text>
        </View>
        <MaterialIcons name="water-drop" size={compact ? 28 : 32} color="#64b5f6" />
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percentText}>{percent}% mục tiêu</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.8}
          onPress={() => onAddWater(250)}
        >
          <Text style={styles.btnSecondaryText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.8}
          onPress={() => onAddWater(500)}
        >
          <MaterialIcons name="add" size={18} color={colors.onPrimaryFixed} />
          <Text style={styles.btnPrimaryText}>+500ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  cardCompact: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  count: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  countHighlight: {
    color: '#64b5f6',
  },
  countGoal: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  progressBg: {
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#64b5f6',
    borderRadius: 5,
  },
  percentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  btnPrimaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.onPrimaryFixed,
  },
});
