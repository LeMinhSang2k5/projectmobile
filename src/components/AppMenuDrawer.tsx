/**
 * Menu drawer (3 gach) - dieu huong tab Home va cac tab khac.
 * Mo thong bao, CMS (admin), dang xuat.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { Tab } from './BottomNav';

type MenuItem = {
  key: Tab | 'notifications' | 'admin' | 'signout';
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle?: string;
};

const NAV_ITEMS: MenuItem[] = [
  { key: 'home', icon: 'dashboard', label: 'Home', subtitle: 'Dashboard & huy hiệu' },
  { key: 'training', icon: 'fitness-center', label: 'Training', subtitle: 'Chương trình tập' },
  { key: 'nutrition', icon: 'restaurant', label: 'Nutrition', subtitle: 'Dinh dưỡng & nước' },
  { key: 'profile', icon: 'person', label: 'Profile', subtitle: 'Hồ sơ cá nhân' },
];

type Props = {
  visible: boolean;
  activeTab: Tab;
  displayName?: string | null;
  isAdmin?: boolean;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
  onOpenNotifications: () => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
};

/** Drawer menu ben trai - dieu huong ve tab Home va cac tab khac */
export default function AppMenuDrawer({
  visible,
  activeTab,
  displayName,
  isAdmin = false,
  onClose,
  onNavigate,
  onOpenNotifications,
  onOpenAdmin,
  onSignOut,
}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  /** Animation truot drawer tu trai */
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -300,
      duration: visible ? 240 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  /** Xac nhan truoc khi dang xuat */
  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          onClose();
          onSignOut();
        },
      },
    ]);
  };

  /** Xu ly bam menu: chuyen tab, mo thong bao, admin, hoac sign out */
  const handleItemPress = (key: MenuItem['key']) => {
    onClose();
    if (key === 'signout') {
      handleSignOut();
      return;
    }
    if (key === 'notifications') {
      onOpenNotifications();
      return;
    }
    if (key === 'admin') {
      onOpenAdmin?.();
      return;
    }
    onNavigate(key);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.drawer,
            { paddingTop: insets.top + 16, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brandTitle}>ELITE FIT</Text>
              <Text style={styles.brandSub}>
                Xin chào, {displayName?.trim() || 'bạn'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>ĐIỀU HƯỚNG</Text>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleItemPress(item.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={isActive ? colors.onPrimaryFixed : colors.primaryFixed}
                  />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.menuSub}>{item.subtitle}</Text>
                  ) : null}
                </View>
                {isActive ? (
                  <MaterialIcons name="check-circle" size={18} color={colors.primaryFixed} />
                ) : null}
              </TouchableOpacity>
            );
          })}

          <Text style={styles.sectionLabel}>CÀI ĐẶT</Text>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleItemPress('admin')}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrap}>
                <MaterialIcons name="admin-panel-settings" size={22} color={colors.primaryFixed} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>Quản trị CMS</Text>
                <Text style={styles.menuSub}>Programs, exercises, foods...</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('notifications')}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons name="notifications" size={22} color={colors.primaryFixed} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Thông báo</Text>
              <Text style={styles.menuSub}>Nhắc tập, nước, huy hiệu</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.signOutItem]}
            onPress={() => handleItemPress('signout')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, styles.signOutIcon]}>
              <MaterialIcons name="logout" size={22} color="#ff6b6b" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.signOutLabel}>Đăng xuất</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.glassBorder,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brandTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
    color: colors.primaryFixed,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(198, 243, 51, 0.1)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryFixed,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  menuLabelActive: {
    color: colors.primaryFixed,
  },
  menuSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  signOutItem: {
    marginTop: 12,
  },
  signOutIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  signOutLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#ff6b6b',
  },
});
