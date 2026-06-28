import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/layout';

export type Tab = 'home' | 'training' | 'nutrition' | 'profile';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

const NAV_ITEMS: { key: Tab; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { key: 'home', icon: 'dashboard', label: 'Home' },
  { key: 'training', icon: 'fitness-center', label: 'Training' },
  { key: 'nutrition', icon: 'restaurant', label: 'Nutrition' },
  { key: 'profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.container}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.85}
              onPress={() => onTabChange(item.key)}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={isActive ? colors.onPrimaryFixed : colors.onSurfaceVariant}
                />
              </View>
              <Text style={isActive ? styles.navTextActive : styles.navText}>
                {item.label}
              </Text>
              {isActive ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 26, 26, 0.96)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryFixed,
  },
  navText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  navTextActive: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.primaryFixed,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryFixed,
    marginTop: 2,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
