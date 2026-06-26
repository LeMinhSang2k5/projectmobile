import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Tab = 'home' | 'training' | 'progress' | 'profile';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

const NAV_ITEMS: { key: Tab; icon: any; label: string }[] = [
  { key: 'home', icon: 'dashboard', label: 'Home' },
  { key: 'training', icon: 'fitness-center', label: 'Training' },
  { key: 'progress', icon: 'insights', label: 'Progress' },
  { key: 'profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <View style={styles.container}>
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={isActive ? styles.navItemActive : styles.navItem}
            activeOpacity={0.8}
            onPress={() => onTabChange(item.key)}
          >
            <MaterialIcons
              name={item.icon}
              size={22}
              color={isActive ? colors.onPrimaryFixed : colors.onSurfaceVariant}
            />
            <Text style={isActive ? styles.navTextActive : styles.navText}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(18, 20, 20, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(68, 73, 52, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 16,
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    flex: 1,
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 4,
  },
  navText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  navTextActive: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
    marginTop: 2,
  },
});
