import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  getNotificationPreferences,
  isNotificationSupported,
  updateNotificationPreferences,
} from '../services/notificationService';
import type { NotificationPreferences } from '../types';

type Props = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onUpdated?: () => void;
};

function parseTime(value: string): Date {
  const [hourText, minuteText] = value.split(':');
  const date = new Date();
  date.setHours(Number(hourText) || 6, Number(minuteText) || 30, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function NotificationSettingsModal({
  visible,
  userId,
  onClose,
  onUpdated,
}: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getNotificationPreferences(userId)
      .then(setPrefs)
      .catch((error) => {
        Alert.alert('Lỗi', error.message ?? 'Không thể tải cài đặt thông báo');
      })
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const updated = await updateNotificationPreferences(userId, { [key]: value });
      setPrefs(updated);
      onUpdated?.();
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = async (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selected || !prefs) return;
    const wakeup_time = formatTime(selected);
    setSaving(true);
    try {
      const updated = await updateNotificationPreferences(userId, { wakeup_time });
      setPrefs(updated);
      onUpdated?.();
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể cập nhật giờ tập');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Cài đặt thông báo</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {!isNotificationSupported() && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Expo Go: nhắc uống nước dùng chế độ trong app. Nhắc tập luyện push cần development build.
              </Text>
            </View>
          )}

          {loading || !prefs ? (
            <ActivityIndicator color={colors.primaryFixed} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Nhắc uống nước</Text>
                  <Text style={styles.rowSub}>Mỗi 2 giờ từ 7:00 – 21:00</Text>
                </View>
                <Switch
                  value={prefs.water_reminder_enabled}
                  onValueChange={(value) => void handleToggle('water_reminder_enabled', value)}
                  disabled={saving}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={colors.onSurface}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Nhắc tập luyện</Text>
                  <Text style={styles.rowSub}>Hàng ngày lúc {prefs.wakeup_time}</Text>
                </View>
                <Switch
                  value={prefs.workout_reminder_enabled}
                  onValueChange={(value) => void handleToggle('workout_reminder_enabled', value)}
                  disabled={saving}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={colors.onSurface}
                />
              </View>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
                disabled={saving}
              >
                <MaterialIcons name="schedule" size={20} color={colors.primaryFixed} />
                <Text style={styles.timeButtonText}>Đổi giờ nhắc tập: {prefs.wakeup_time}</Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Thông báo huy hiệu</Text>
                  <Text style={styles.rowSub}>Báo khi mở khóa huy hiệu mới</Text>
                </View>
                <Switch
                  value={prefs.badge_notifications_enabled}
                  onValueChange={(value) => void handleToggle('badge_notifications_enabled', value)}
                  disabled={saving}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={colors.onSurface}
                />
              </View>
            </>
          )}

          {showTimePicker && prefs && (
            <DateTimePicker
              value={parseTime(prefs.wakeup_time)}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>
      </View>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  notice: {
    backgroundColor: 'rgba(198, 243, 51, 0.08)',
    borderColor: colors.primaryFixed,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  rowSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  timeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primaryFixed,
  },
});
