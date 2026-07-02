import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/layout';

type Props = {
  visible: boolean;
  title: string;
  loading?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
};

export default function AdminEditSheet({
  visible,
  title,
  loading = false,
  onClose,
  onSave,
  children,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
              ) : (
                <Text style={styles.saveText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: colors.onPrimaryFixed,
  },
});
