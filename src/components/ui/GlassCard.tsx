import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/layout';

type Variant = 'default' | 'accent' | 'flat';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
  padding?: number;
};

export default function GlassCard({
  children,
  style,
  variant = 'default',
  padding = spacing.xl,
}: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'accent' && styles.accent,
        variant === 'flat' && styles.flat,
        { padding },
        style,
      ]}
    >
      <View style={styles.innerHighlight} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  accent: {
    backgroundColor: colors.accentMuted,
    borderColor: 'rgba(198, 243, 51, 0.28)',
  },
  flat: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.outlineVariant,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassHighlight,
  },
});
