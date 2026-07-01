import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  message: string;
  compact?: boolean;
};

export default function LimitWarningBanner({ title, message, compact = false }: Props) {
  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <MaterialIcons name="warning-amber" size={compact ? 18 : 22} color="#ff8a65" />
      <View style={styles.textWrap}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  bannerCompact: {
    padding: 10,
    marginBottom: 8,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#ff8a65',
    marginBottom: 2,
  },
  titleCompact: {
    fontSize: 13,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
});
