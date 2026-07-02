import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/layout';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type AlertOptions = {
  title: string;
  message: string;
  buttonLabel?: string;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type PendingAlert = AlertOptions & {
  resolve: () => void;
};

type AdminDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const AdminDialogContext = createContext<AdminDialogContextValue | null>(null);

export function useAdminDialog(): AdminDialogContextValue {
  const ctx = useContext(AdminDialogContext);
  if (!ctx) {
    throw new Error('useAdminDialog must be used within AdminDialogProvider');
  }
  return ctx;
}

export function AdminDialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const [alertState, setAlertState] = useState<PendingAlert | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const closeAlert = () => {
    alertState?.resolve();
    setAlertState(null);
  };

  return (
    <AdminDialogContext.Provider value={{ confirm, alert }}>
      {children}

      <Modal transparent visible={!!confirmState} animationType="fade" onRequestClose={() => closeConfirm(false)}>
        <Pressable style={styles.overlay} onPress={() => closeConfirm(false)}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialIcons
                name={confirmState?.destructive ? 'delete-outline' : 'help-outline'}
                size={28}
                color={confirmState?.destructive ? colors.danger : colors.primaryFixed}
              />
            </View>
            <Text style={styles.dialogTitle}>{confirmState?.title}</Text>
            <Text style={styles.dialogMessage}>{confirmState?.message}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => closeConfirm(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelText}>{confirmState?.cancelLabel ?? 'Hủy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, confirmState?.destructive && styles.confirmBtnDanger]}
                onPress={() => closeConfirm(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.confirmText,
                    confirmState?.destructive && styles.confirmTextDanger,
                  ]}
                >
                  {confirmState?.confirmLabel ?? 'Xác nhận'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={!!alertState} animationType="fade" onRequestClose={closeAlert}>
        <Pressable style={styles.overlay} onPress={closeAlert}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialIcons name="info-outline" size={28} color={colors.primaryFixed} />
            </View>
            <Text style={styles.dialogTitle}>{alertState?.title}</Text>
            <Text style={styles.dialogMessage}>{alertState?.message}</Text>
            <TouchableOpacity style={styles.singleBtn} onPress={closeAlert} activeOpacity={0.85}>
              <Text style={styles.confirmText}>{alertState?.buttonLabel ?? 'Đã hiểu'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminDialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dialogTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  dialogMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
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
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  confirmText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.onPrimaryFixed,
  },
  confirmTextDanger: {
    color: colors.danger,
  },
  singleBtn: {
    minHeight: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
