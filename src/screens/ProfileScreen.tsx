import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Animated, Pressable, TextInput as TextInputType,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { colors } from '../theme/colors';
import { supabase } from '../../utils/supabase';
import type { Profile, UserCourse, DailyWaterIntake, DailyNutrition } from '../types';
import WaterTracker from '../components/WaterTracker';
import MacroChart from '../components/MacroChart';
import {
  getCalorieGoal,
  getMacroGoals,
  getWaterGoalMl,
  recalculateAndSave,
} from '../services/healthService';
import { getTodayWater, addWater } from '../services/waterService';
import { deleteUserAccount, exportUserData } from '../services/accountService';
import { shareUserDataExcel } from '../lib/exportUserDataExcel';
import { calculateAgeFromDate, toLocalDateString } from '../lib/dateUtils';
import { useHideOnScroll } from '../hooks/useHideOnScroll';

// ─── Tính tuổi từ ngày sinh ────────────────────────────────────────
function calcAge(dob: Date): number {
  return calculateAgeFromDate(dob);
}

function formatDob(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Fitness Goal Options ─────────────────────────────────────────
const FITNESS_GOALS = [
  { key: 'lose_weight',    label: 'Giảm Cân',        icon: 'trending-down' },
  { key: 'build_muscle',   label: 'Tăng Cơ',          icon: 'fitness-center' },
  { key: 'maintain',       label: 'Duy Trì',           icon: 'balance' },
  { key: 'improve_cardio', label: 'Cải Thiện Cardio',  icon: 'directions-run' },
  { key: 'flexibility',    label: 'Linh Hoạt',         icon: 'self-improvement' },
] as const;
type GoalKey = typeof FITNESS_GOALS[number]['key'];

// ─── Props ────────────────────────────────────────────────────────
type Props = {
  userId: string;
  isAdmin?: boolean;
  onAvatarUpdated?: (url: string) => void;
  onNavigateToNutrition?: () => void;
  onOpenAdmin?: () => void;
};

// ─────────────────────────────────────────────────────────────────
// EditProfileModal
// ─────────────────────────────────────────────────────────────────
type EditModalProps = {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
  userId: string;
};

function EditProfileModal({ visible, profile, onClose, onSaved, userId }: EditModalProps) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const nameRef = useRef<TextInputType>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (visible && profile) {
      setName(profile.display_name ?? '');
      // Khôi phục dob từ trường date_of_birth nếu có
      const dobField = (profile as any).date_of_birth;
      setDob(dobField ? new Date(dobField) : null);
      setGoal((profile.fitness_goal as GoalKey) ?? null);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, useNativeDriver: true, duration: 220,
      }).start();
    }
  }, [visible, profile]);

  const liveAge = dob != null ? calcAge(dob) : null;

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDob(selected);
  };

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Lỗi', 'Tên không được để trống.');
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      display_name: trimmedName,
      fitness_goal: goal,
    };
    if (dob) {
      payload.date_of_birth = toLocalDateString(dob);
      payload.age = calcAge(dob);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      setSaving(false);
      Alert.alert('Lỗi', error.message);
      return;
    }
    let updatedProfile = data as Profile;
    try {
      updatedProfile = (await recalculateAndSave(userId)) ?? updatedProfile;
    } catch {
      // Profile fields were saved; health targets can be recalculated on next nutrition refresh.
    }
    setSaving(false);
    onSaved(updatedProfile);
    onClose();
  }, [name, dob, goal, userId, onSaved, onClose]);

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 10);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Chỉnh Sửa Hồ Sơ</Text>

          {/* ── Tên ── */}
          <Text style={styles.fieldLabel}>Tên hiển thị</Text>
          <View style={styles.fieldWrapper}>
            <MaterialIcons name="person" size={18} color={colors.onSurfaceVariant} style={styles.fieldIcon} />
            <TextInput
              ref={nameRef}
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên của bạn"
              placeholderTextColor="rgba(196,201,174,0.4)"
              returnKeyType="done"
              blurOnSubmit={true}
              underlineColorAndroid="transparent"
            />
          </View>

          {/* ── Ngày sinh ── */}
          <Text style={styles.fieldLabel}>Ngày sinh</Text>
          <TouchableOpacity
            style={styles.fieldWrapper}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="cake" size={18} color={colors.onSurfaceVariant} style={styles.fieldIcon} />
            <Text style={[styles.fieldInput, styles.fieldInputText, !dob && { color: 'rgba(196,201,174,0.4)' }]}>
              {dob ? formatDob(dob) : 'Chọn ngày sinh'}
            </Text>
            {liveAge != null && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>{liveAge} tuổi</Text>
              </View>
            )}
            <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 14 }} />
          </TouchableOpacity>

          {/* Date Picker — iOS: inline, Android: dialog */}
          {showPicker && (
            <DateTimePicker
              value={dob ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={maxDate}
              minimumDate={minDate}
              locale="vi"
            />
          )}
          {showPicker && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.pickerDoneBtnText}>Xong</Text>
            </TouchableOpacity>
          )}

          {/* ── Mục tiêu ── */}
          <Text style={styles.fieldLabel}>Mục tiêu tập luyện</Text>
          <View style={styles.goalGrid}>
            {FITNESS_GOALS.map((g) => {
              const active = goal === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalChip, active && styles.goalChipActive]}
                  onPress={() => setGoal(g.key)}
                  activeOpacity={0.75}
                >
                  <MaterialIcons
                    name={g.icon as any}
                    size={16}
                    color={active ? colors.onPrimaryFixed : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Buttons ── */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                : <Text style={styles.saveBtnText}>Lưu</Text>
              }
            </TouchableOpacity>
          </View>
          <View style={{ height: 24 }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main ProfileScreen
// ─────────────────────────────────────────────────────────────────
export default function ProfileScreen({
  userId,
  isAdmin = false,
  onAvatarUpdated,
  onNavigateToNutrition,
  onOpenAdmin,
}: Props) {
  const today = toLocalDateString();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeCourse, setActiveCourse] = useState<UserCourse | null>(null);
  const [water, setWater] = useState<DailyWaterIntake | null>(null);
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const handleScroll = useHideOnScroll();

  const fetchData = async () => {
    try {
      const [profileRes, courseRes, waterRes, nutritionRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_courses').select('*, workout_courses(*)')
          .eq('user_id', userId).eq('is_active', true).maybeSingle(),
        supabase.from('daily_water_intake').select('*')
          .eq('user_id', userId).eq('date', today).maybeSingle(),
        supabase.from('daily_nutrition').select('*')
          .eq('user_id', userId).eq('date', today).maybeSingle(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (courseRes.data) setActiveCourse(courseRes.data);
      if (waterRes.data) setWater(waterRes.data);
      if (nutritionRes.data) setNutrition(nutritionRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  // ── Tính tuổi real-time từ date_of_birth ──
  const dobField = (profile as any)?.date_of_birth;
  const liveAge = dobField ? calcAge(new Date(dobField)) : profile?.age ?? null;

  // ── Upload Avatar ──────────────────────────────────────────────
  const handlePickAvatar = useCallback(async () => {
    // Xin quyền truy cập thư viện ảnh
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Hãy cho phép ứng dụng truy cập thư viện ảnh trong Cài Đặt.');
      return;
    }

    Alert.alert('Cập nhật ảnh đại diện', 'Chọn nguồn ảnh:', [
      {
        text: 'Chụp ảnh',
        onPress: async () => {
          const camStatus = await ImagePicker.requestCameraPermissionsAsync();
          if (camStatus.status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
            base64: true,
          });
          if (!result.canceled && result.assets[0].base64) uploadAvatar(result.assets[0].uri, result.assets[0].base64);
        },
      },
      {
        text: 'Chọn từ thư viện',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
            base64: true,
          });
          if (!result.canceled && result.assets[0].base64) uploadAvatar(result.assets[0].uri, result.assets[0].base64);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [userId]);

  const uploadAvatar = async (localUri: string, base64Data: string) => {
    try {
      setUploadingAvatar(true);

      const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${userId}/avatar_${Date.now()}.${ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

      // Upload lên Supabase Storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64Data), { contentType, upsert: true });

      if (uploadError) throw uploadError;

      // Lấy public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Cập nhật bảng profiles
      const { data, error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
        .select()
        .single();

      if (dbError) throw dbError;

      setProfile(data as Profile);
      onAvatarUpdated?.(publicUrl); // Cập nhật Header
    } catch (err: any) {
      console.error('Lỗi tải ảnh Supabase:', err);
      Alert.alert('Lỗi tải ảnh', err.message ?? 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const payload = await exportUserData();
      await shareUserDataExcel(payload);
      Alert.alert('Thành công', 'File Excel (.xlsx) đã sẵn sàng để lưu hoặc chia sẻ.');
    } catch (err: any) {
      Alert.alert('Lỗi xuất dữ liệu', err.message ?? 'Không thể xuất dữ liệu. Vui lòng thử lại.');
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản',
      'Hành động này xóa vĩnh viễn hồ sơ, lịch sử tập và dinh dưỡng. Bạn không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteUserAccount();
              Alert.alert('Đã xóa', 'Tài khoản của bạn đã được xóa.');
            } catch (err: any) {
              Alert.alert('Lỗi', err.message ?? 'Không thể xóa tài khoản.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const handleAddWater = async (ml: number) => {
    try {
      const updated = await addWater(userId, ml, profile, today);
      setWater(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Không thể cập nhật nước');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryFixed} />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  const calorieGoal = getCalorieGoal(profile);
  const caloriesConsumed = nutrition?.calories_consumed ?? 0;
  const caloriePercent = Math.min((caloriesConsumed / calorieGoal) * 100, 100);
  const waterMl = water?.water_ml ?? 0;
  const waterGoalMl = water?.water_goal_ml ?? getWaterGoalMl(profile);
  const macroGoals = getMacroGoals(profile);
  const goalInfo = FITNESS_GOALS.find(g => g.key === profile?.fitness_goal);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.primaryFixed}
          />
        }
      >
        {/* ─── Profile Header ─── */}
        <View style={styles.profileHeader}>
          {/* Avatar với nút upload */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.85}
              style={styles.avatarTouchable}
            >
              {uploadingAvatar ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="small" color={colors.primaryFixed} />
                </View>
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={40} color={colors.primaryFixed} />
                </View>
              )}
              {/* Camera overlay */}
              <View style={styles.cameraOverlay}>
                <MaterialIcons name="camera-alt" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.avatarBadge}>
              <MaterialIcons name="star" size={12} color={colors.onPrimaryFixed} />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>
              {profile?.display_name ?? 'Elite Athlete'}
            </Text>
            {/* Tuổi real-time */}
            {liveAge != null && (
              <View style={styles.ageRow}>
                <MaterialIcons name="cake" size={13} color={colors.primaryFixed} />
                <Text style={styles.profileAge}>{liveAge} tuổi</Text>
                {dobField && (
                  <Text style={styles.profileDob}>
                    · {formatDob(new Date(dobField))}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.profileMeta}>
              Thành viên từ {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
                : '—'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>PRO</Text>
              </View>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={18} color={colors.primaryFixed} />
          </TouchableOpacity>
        </View>

        {/* ─── Fitness Goal Banner ─── */}
        {goalInfo ? (
          <TouchableOpacity
            style={styles.goalBanner}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name={goalInfo.icon as any} size={22} color={colors.onPrimaryFixed} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.goalBannerLabel}>Mục tiêu của bạn</Text>
              <Text style={styles.goalBannerValue}>{goalInfo.label}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.onPrimaryFixed} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.goalBannerEmpty}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="flag" size={20} color={colors.primaryFixed} />
            <Text style={styles.goalBannerEmptyText}>Thiết lập mục tiêu tập luyện</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.primaryFixed} />
          </TouchableOpacity>
        )}

        {/* ─── Stats Row ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCourse?.completed_sessions ?? 0}</Text>
            <Text style={styles.statLabel}>Buổi Tập</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{calorieGoal}</Text>
            <Text style={styles.statLabel}>Kcal Mục Tiêu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{liveAge ?? '--'}</Text>
            <Text style={styles.statLabel}>Tuổi</Text>
          </View>
        </View>

        {/* ─── Active Course ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khóa Tập Hiện Tại</Text>
          {activeCourse ? (
            <View style={styles.courseCard}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>{activeCourse.workout_courses?.title}</Text>
                <Text style={styles.courseMeta}>
                  {activeCourse.workout_courses?.target_muscle} · {activeCourse.workout_courses?.difficulty}
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(activeCourse.completed_sessions / (activeCourse.workout_courses?.total_sessions ?? 1)) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Buổi {activeCourse.completed_sessions}/{activeCourse.workout_courses?.total_sessions}
                </Text>
              </View>
              <MaterialIcons name="fitness-center" size={32} color={colors.primaryFixed} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="add-circle-outline" size={32} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>Chưa có khóa tập. Hãy chọn một khóa!</Text>
            </View>
          )}
        </View>

        {/* ─── Dinh Dưỡng ─── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Dinh Dưỡng Hôm Nay</Text>
            {onNavigateToNutrition && (
              <TouchableOpacity onPress={onNavigateToNutrition}>
                <Text style={styles.linkText}>Chi tiết →</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <Text style={styles.nutritionCalories}>{caloriesConsumed} <Text style={styles.nutritionCalUnit}>kcal</Text></Text>
              <Text style={styles.nutritionGoal}>/ {calorieGoal} kcal</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${caloriePercent}%` }]} />
            </View>
            <MacroChart
              protein={nutrition?.protein_g ?? 0}
              carbs={nutrition?.carbs_g ?? 0}
              fat={nutrition?.fat_g ?? 0}
              proteinGoal={macroGoals.protein_g}
              carbsGoal={macroGoals.carbs_g}
              fatGoal={macroGoals.fat_g}
            />
          </View>
        </View>

        {/* ─── Lượng Nước ─── */}
        <View style={styles.section}>
          <WaterTracker
            waterMl={waterMl}
            waterGoalMl={waterGoalMl}
            onAddWater={handleAddWater}
          />
        </View>

        {/* ─── Quản trị CMS (admin) ─── */}
        {isAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quản trị</Text>
            <TouchableOpacity
              style={styles.privacyBtn}
              onPress={onOpenAdmin}
              activeOpacity={0.8}
            >
              <MaterialIcons name="admin-panel-settings" size={18} color={colors.primaryFixed} />
              <Text style={styles.privacyBtnText}>Mở CMS Admin</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── Quyền riêng tư & bảo mật ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
          <TouchableOpacity
            style={styles.privacyBtn}
            onPress={handleExportData}
            disabled={exportingData || deletingAccount}
            activeOpacity={0.8}
          >
            {exportingData ? (
              <ActivityIndicator size="small" color={colors.primaryFixed} />
            ) : (
              <MaterialIcons name="download" size={18} color={colors.primaryFixed} />
            )}
            <Text style={styles.privacyBtnText}>Xuất dữ liệu của tôi</Text>
          </TouchableOpacity>

        </View>

        {/* ─── Sign Out ─── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={18} color="#ff6b6b" />
          <Text style={styles.signOutText}>Đăng Xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Edit Modal ─── */}
      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSaved={(updated) => setProfile(updated)}
        userId={userId}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  loadingText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 12 },

  // ── Header ──
  profileHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20,
    backgroundColor: 'rgba(30,32,32,0.6)',
    marginHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(198,243,51,0.1)',
    marginBottom: 12,
  },
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatarTouchable: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primaryFixed },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(198,243,51,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primaryFixed,
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.primaryFixed,
    borderRadius: 10, width: 22, height: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(18,20,20,0.9)',
  },
  avatarBadge: {
    position: 'absolute', top: 0, right: -4,
    backgroundColor: colors.primaryFixed, borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  displayName: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: colors.onSurface, marginBottom: 4 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  profileAge: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primaryFixed },
  profileDob: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.onSurfaceVariant },
  profileMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 8 },
  badgeRow: { flexDirection: 'row' },
  badge: {
    backgroundColor: 'rgba(198,243,51,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(198,243,51,0.3)',
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: colors.primaryFixed },
  editBtn: {
    padding: 8, backgroundColor: 'rgba(198,243,51,0.1)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(198,243,51,0.25)',
  },

  // ── Goal Banner ──
  goalBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.primaryFixed,
  },
  goalBannerLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: 'rgba(0,0,0,0.6)' },
  goalBannerValue: { fontFamily: 'Montserrat-Bold', fontSize: 15, color: colors.onPrimaryFixed },
  goalBannerEmpty: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 14, gap: 10,
    backgroundColor: 'rgba(198,243,51,0.07)',
    borderWidth: 1, borderColor: 'rgba(198,243,51,0.2)',
    borderStyle: 'dashed',
  },
  goalBannerEmptyText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.primaryFixed },

  // ── Stats ──
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: 'rgba(30,32,32,0.7)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(68,73,52,0.3)',
  },
  statCardMiddle: { borderColor: 'rgba(198,243,51,0.2)' },
  statValue: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: colors.primaryFixed },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },

  // ── Section ──
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontFamily: 'Montserrat-Bold', fontSize: 16, color: colors.onSurface, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  linkText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.primaryFixed },

  // ── Course ──
  courseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30,32,32,0.7)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(198,243,51,0.1)',
  },
  courseInfo: { flex: 1 },
  courseTitle: { fontFamily: 'Montserrat-Bold', fontSize: 16, color: colors.onSurface, marginBottom: 4 },
  courseMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 10, textTransform: 'capitalize' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(68,73,52,0.3)', borderRadius: 3, marginBottom: 6 },
  progressBarFill: { height: 6, backgroundColor: colors.primaryFixed, borderRadius: 3 },
  progressText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.onSurfaceVariant },
  emptyCard: {
    alignItems: 'center', padding: 24,
    backgroundColor: 'rgba(30,32,32,0.5)',
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(68,73,52,0.2)', borderStyle: 'dashed',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' },

  // ── Nutrition ──
  nutritionCard: {
    backgroundColor: 'rgba(30,32,32,0.7)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(68,73,52,0.2)',
  },
  nutritionHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  nutritionCalories: { fontFamily: 'Montserrat-Bold', fontSize: 28, color: colors.primaryFixed },
  nutritionCalUnit: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.primaryFixed },
  nutritionGoal: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.onSurfaceVariant, marginLeft: 6 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  macroItem: { alignItems: 'center' },
  macroDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  macroLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.onSurfaceVariant },
  macroValue: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.onSurface },

  // ── Water ──
  waterCard: {
    backgroundColor: 'rgba(30,32,32,0.7)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(68,73,52,0.2)',
  },
  waterCount: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.primaryFixed },
  waterCupsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  waterHint: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.onSurfaceVariant },

  // ── Sign Out ──
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ff6b6b', marginLeft: 8 },
  privacyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(198,243,51,0.35)',
    backgroundColor: 'rgba(198,243,51,0.08)', marginBottom: 10,
  },
  privacyBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.primaryFixed, marginLeft: 8 },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)',
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  deleteAccountText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ff6b6b', marginLeft: 8 },

  // ── Edit Modal ──
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#1a1c1c',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderColor: 'rgba(198,243,51,0.12)',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: 'rgba(196,201,174,0.2)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Montserrat-Bold', fontSize: 20,
    color: colors.onSurface, marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'Inter-Medium', fontSize: 12,
    color: colors.onSurfaceVariant, marginBottom: 6, marginLeft: 4,
  },
  fieldWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(51,53,53,0.6)',
    borderWidth: 1, borderColor: 'rgba(68,73,52,0.4)',
    borderRadius: 12, height: 50, marginBottom: 18,
  },
  fieldIcon: { marginLeft: 14, marginRight: 8 },
  fieldInput: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 16,
    color: colors.onSurface, height: '100%', paddingVertical: 0,
  },
  fieldInputText: {
    lineHeight: 50,
  },
  ageBadge: {
    backgroundColor: 'rgba(198,243,51,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    marginRight: 8,
  },
  ageBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: colors.primaryFixed },
  pickerDoneBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: colors.primaryFixed, borderRadius: 10, marginBottom: 12,
  },
  pickerDoneBtnText: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.onPrimaryFixed },

  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'rgba(51,53,53,0.5)',
    borderWidth: 1, borderColor: 'rgba(68,73,52,0.3)',
  },
  goalChipActive: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  goalChipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.onSurfaceVariant },
  goalChipTextActive: { color: colors.onPrimaryFixed },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 50, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(68,73,52,0.4)',
    backgroundColor: 'rgba(51,53,53,0.4)',
  },
  cancelBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.onSurfaceVariant },
  saveBtn: {
    flex: 2, height: 50, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, backgroundColor: colors.primaryFixed,
  },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.onPrimaryFixed },
});
