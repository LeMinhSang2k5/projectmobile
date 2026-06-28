import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  value: number;
  maxValue: number;
  sublabel?: string;
  size?: number;
};

export function CalorieRing({ value, maxValue, sublabel = 'kcal', size = 120 }: Props) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const progress = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
  const strokeDashoffset = circumference - progress * circumference;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surfaceVariant}
          strokeWidth={8}
          fill="transparent"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primaryFixed}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.textOverlay}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
  );
}

type MacroProps = {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
};

const MACRO_COLORS = {
  protein: '#c6f333',
  carbs: '#64b5f6',
  fat: '#ffb74d',
};

export default function MacroChart({
  protein,
  carbs,
  fat,
  proteinGoal,
  carbsGoal,
  fatGoal,
}: MacroProps) {
  const total = protein + carbs + fat;
  const segments = [
    { label: 'Đạm', value: protein, goal: proteinGoal, color: MACRO_COLORS.protein },
    { label: 'Carbs', value: carbs, goal: carbsGoal, color: MACRO_COLORS.carbs },
    { label: 'Béo', value: fat, goal: fatGoal, color: MACRO_COLORS.fat },
  ];

  return (
    <View style={styles.macroContainer}>
      <View style={styles.macroBar}>
        {total > 0 ? (
          segments.map((seg) => (
            <View
              key={seg.label}
              style={[
                styles.macroSegment,
                { flex: seg.value, backgroundColor: seg.color },
              ]}
            />
          ))
        ) : (
          <View style={[styles.macroSegment, { flex: 1, backgroundColor: colors.surfaceVariant }]} />
        )}
      </View>
      <View style={styles.macroLegend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: seg.color }]} />
            <Text style={styles.macroLabel}>{seg.label}</Text>
            <Text style={styles.macroValue}>
              {seg.value}g{seg.goal != null ? ` / ${seg.goal}g` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  sublabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  macroContainer: {
    gap: 12,
  },
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  macroSegment: {
    height: '100%',
    minWidth: 4,
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  macroValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: colors.onSurface,
  },
});
