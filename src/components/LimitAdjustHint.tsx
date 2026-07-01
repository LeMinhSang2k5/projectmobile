import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
};

export default function LimitAdjustHint({
  message,
  actionLabel,
  onAction,
  onDismiss,
  compact = false,
}: Props) {
  return (
    <View style={[styles.hint, compact && styles.hintCompact]}>
      <MaterialIcons name="info-outline" size={compact ? 18 : 20} color={colors.primaryFixed} />
      <View style={styles.textWrap}>
        <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {onDismiss ? (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Đóng cảnh báo"
        >
          <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(198, 243, 51, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(198, 243, 51, 0.22)',
  },
  hintCompact: {
    padding: 10,
    marginBottom: 8,
  },
  textWrap: {
    flex: 1,
    gap: 8,
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
  actionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.onPrimaryFixed,
  },
  dismissBtn: {
    padding: 2,
    marginTop: -2,
  },
});
