/**
 * Header tren cung khi o tab Home (va cac tab khac).
 * Menu 3 gach, logo, avatar -> Profile.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/layout';

type Props = {
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
  onMenuPress?: () => void;
};

/** Thanh header co safe area, nut menu va avatar */
export default function Header({ avatarUrl, onAvatarPress, onMenuPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity
        style={styles.menuButton}
        activeOpacity={0.75}
        onPress={onMenuPress}
        hitSlop={10}
      >
        <MaterialIcons name="menu" size={24} color={colors.primaryFixed} />
      </TouchableOpacity>

      <View style={styles.brandWrap}>
        <Image
          source={require('../../public/fitness_app_logo_letter_f.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.title}>FlexFit</Text>
          <Text style={styles.tagline}>Performance Hub</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.avatarContainer}
        activeOpacity={0.8}
        onPress={onAvatarPress}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <MaterialIcons name="person" size={18} color={colors.primaryFixed} />
          </View>
        )}
        <View style={styles.onlineDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(18, 20, 20, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 20,
    color: colors.primaryFixed,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.caption,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
