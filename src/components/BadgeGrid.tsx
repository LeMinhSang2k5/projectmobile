/**
 * Lưới huy hiệu trên Dashboard — badge đã đạt sáng, chưa đạt mờ (opacity 0.65).
 * @see docs/pdf/dac_ta_ky_thuat_de_hieu.pdf — mục 4.1, 4.5
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/layout';
import GlassCard from './ui/GlassCard';
import type { BadgeWithStatus } from '../types';

type Props = {
  badges: BadgeWithStatus[];
};

export default function BadgeGrid({ badges }: Props) {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <GlassCard
          key={badge.id}
          style={[styles.badgeItem, !badge.earned && styles.badgeItemLocked]}
          padding={spacing.lg}
          variant={badge.earned ? 'accent' : 'flat'}
        >
          <View style={[styles.iconCircle, badge.earned && styles.iconCircleEarned]}>
            <MaterialIcons
              name={badge.icon as keyof typeof MaterialIcons.glyphMap}
              size={20}
              color={badge.earned ? colors.onPrimaryFixed : colors.onSurfaceVariant}
            />
          </View>
          <Text style={[styles.badgeTitle, !badge.earned && styles.badgeTitleLocked]} numberOfLines={2}>
            {badge.title}
          </Text>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {badge.description}
          </Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  badgeItem: {
    width: '47.5%',
  },
  badgeItemLocked: {
    opacity: 0.65,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCircleEarned: {
    backgroundColor: colors.primaryFixed,
  },
  badgeTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  badgeTitleLocked: {
    color: colors.onSurfaceVariant,
  },
  badgeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
});
