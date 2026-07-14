import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../utils/supabase';
import {
  calculateHealthMetrics,
  type ActivityLevel,
  type FitnessGoal,
  type Gender,
} from '../lib/healthCalculations';
import { calculateAgeFromDate, toLocalDateString } from '../lib/dateUtils';
import type { Profile } from '../types';

type Props = {
  userId: string;
  onCompleted: (profile: Profile) => void;
};

const GENDERS: Array<{ key: Gender; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'male', label: 'Nam', icon: 'male' },
  { key: 'female', label: 'Nữ', icon: 'female' },
  { key: 'other', label: 'Khác', icon: 'person-outline' },
];

const GOALS: Array<{ key: FitnessGoal; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'lose_weight', label: 'Giảm cân', icon: 'trending-down' },
  { key: 'build_muscle', label: 'Tăng cơ', icon: 'fitness-center' },
  { key: 'maintain', label: 'Duy trì', icon: 'balance' },
  { key: 'improve_cardio', label: 'Tăng sức bền', icon: 'directions-run' },
  { key: 'flexibility', label: 'Linh hoạt', icon: 'self-improvement' },
];

const ACTIVITIES: Array<{ key: ActivityLevel; label: string; detail: string }> = [
  { key: 'sedentary', label: 'Ít vận động', detail: 'Hầu như không tập' },
  { key: 'lightly_active', label: 'Nhẹ', detail: '1–3 buổi/tuần' },
  { key: 'moderately_active', label: 'Vừa', detail: '3–5 buổi/tuần' },
  { key: 'very_active', label: 'Nhiều', detail: '6–7 buổi/tuần' },
  { key: 'extra_active', label: 'Rất nhiều', detail: 'Vận động cường độ cao' },
];

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export default function OnboardingScreen({ userId, onCompleted }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1, 12));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setName(data.display_name ?? '');
        if (data.date_of_birth) setDob(parseLocalDate(data.date_of_birth));
        setGender(data.gender ?? null);
        setHeight(data.height_cm ? String(data.height_cm) : '');
        setWeight(data.weight_kg ? String(data.weight_kg) : '');
        setGoal(data.fitness_goal ?? null);
        setActivity(data.activity_level ?? null);
      }
      setLoading(false);
    };
    void loadProfile();
    return () => { active = false; };
  }, [userId]);

  const progress = useMemo(() => (['33.33%', '66.67%', '100%'] as const)[step], [step]);
  const age = calculateAgeFromDate(dob);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (name.trim().length < 2) {
        Alert.alert('Thiếu thông tin', 'Tên hiển thị cần ít nhất 2 ký tự.');
        return false;
      }
      if (age < 10 || age > 100 || !gender) {
        Alert.alert('Kiểm tra thông tin', 'Hãy chọn ngày sinh hợp lệ và giới tính.');
        return false;
      }
    }
    if (step === 1) {
      const heightValue = Number(height);
      const weightValue = Number(weight);
      if (heightValue < 100 || heightValue > 250 || weightValue < 25 || weightValue > 350) {
        Alert.alert('Kiểm tra chỉ số', 'Chiều cao hợp lệ: 100–250 cm. Cân nặng: 25–350 kg.');
        return false;
      }
    }
    if (step === 2 && (!goal || !activity)) {
      Alert.alert('Thiếu thông tin', 'Hãy chọn mục tiêu và mức vận động.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(2, current + 1));
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDob(selected);
  };

  const handleComplete = async () => {
    if (!validateStep() || !gender || !goal || !activity) return;
    const heightValue = Number(height);
    const weightValue = Number(weight);
    const metrics = calculateHealthMetrics({
      height_cm: heightValue,
      weight_kg: weightValue,
      age,
      gender,
      fitness_goal: goal,
      activity_level: activity,
    });

    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: name.trim(),
        date_of_birth: toLocalDateString(dob),
        age,
        gender,
        height_cm: heightValue,
        weight_kg: weightValue,
        fitness_goal: goal,
        activity_level: activity,
        bmi: metrics.bmi,
        bmr: metrics.bmr,
        tdee: metrics.tdee,
        daily_calorie_goal: metrics.daily_calorie_goal,
        protein_goal_g: metrics.macro_targets.protein_g,
        carbs_goal_g: metrics.macro_targets.carbs_g,
        fat_goal_g: metrics.macro_targets.fat_g,
        water_goal_ml: metrics.water_goal_ml,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();
    setSaving(false);

    if (error) {
      Alert.alert('Không thể lưu hồ sơ', error.message);
      return;
    }
    onCompleted(data as Profile);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryFixed} />
        <Text style={styles.loadingText}>Đang chuẩn bị hồ sơ...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>FlexFit</Text>
          <Text style={styles.stepText}>Bước {step + 1} / 3</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progress }]} />
          </View>
        </View>

        {step === 0 && (
          <View style={styles.section}>
            <MaterialIcons name="waving-hand" size={34} color={colors.primaryFixed} />
            <Text style={styles.title}>Chào bạn!</Text>
            <Text style={styles.subtitle}>Hãy cho chúng mình biết một chút về bạn.</Text>

            <Text style={styles.label}>Tên hiển thị</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Tên của bạn"
              placeholderTextColor={colors.onSurfaceVariant}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity style={styles.inputButton} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="cake" size={20} color={colors.primaryFixed} />
              <Text style={styles.inputButtonText}>
                {dob.toLocaleDateString('vi-VN')} · {age} tuổi
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dob}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date(new Date().getFullYear() - 10, 11, 31)}
                minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                onChange={handleDateChange}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.dateDoneButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateDoneText}>Xong</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chip, gender === item.key && styles.chipActive]}
                  onPress={() => setGender(item.key)}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={18}
                    color={gender === item.key ? colors.onPrimaryFixed : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.chipText, gender === item.key && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.section}>
            <MaterialIcons name="monitor-weight" size={36} color={colors.primaryFixed} />
            <Text style={styles.title}>Chỉ số cơ thể</Text>
            <Text style={styles.subtitle}>Dữ liệu này giúp tính calo và mục tiêu nước chính xác hơn.</Text>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.label}>Chiều cao</Text>
                <View style={styles.unitInput}>
                  <TextInput
                    style={styles.unitTextInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="decimal-pad"
                    placeholder="170"
                    placeholderTextColor={colors.onSurfaceVariant}
                  />
                  <Text style={styles.unit}>cm</Text>
                </View>
              </View>
              <View style={styles.measureField}>
                <Text style={styles.label}>Cân nặng</Text>
                <View style={styles.unitInput}>
                  <TextInput
                    style={styles.unitTextInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholder="65"
                    placeholderTextColor={colors.onSurfaceVariant}
                  />
                  <Text style={styles.unit}>kg</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoCard}>
              <MaterialIcons name="lock-outline" size={18} color={colors.primaryFixed} />
              <Text style={styles.infoText}>Chỉ tài khoản của bạn được phép đọc và cập nhật dữ liệu sức khỏe này.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <MaterialIcons name="flag" size={36} color={colors.primaryFixed} />
            <Text style={styles.title}>Mục tiêu của bạn</Text>
            <Text style={styles.subtitle}>Bạn luôn có thể thay đổi các lựa chọn này trong Profile.</Text>

            <Text style={styles.label}>Mục tiêu chính</Text>
            <View style={styles.optionGrid}>
              {GOALS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.optionCard, goal === item.key && styles.optionCardActive]}
                  onPress={() => setGoal(item.key)}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={goal === item.key ? colors.onPrimaryFixed : colors.primaryFixed}
                  />
                  <Text style={[styles.optionTitle, goal === item.key && styles.optionTitleActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mức vận động</Text>
            <View style={styles.activityList}>
              {ACTIVITIES.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.activityCard, activity === item.key && styles.activityCardActive]}
                  onPress={() => setActivity(item.key)}
                >
                  <View style={styles.radioOuter}>
                    {activity === item.key && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>{item.label}</Text>
                    <Text style={styles.activityDetail}>{item.detail}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep((current) => current - 1)}>
              <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
              <Text style={styles.backText}>Quay lại</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={step === 2 ? handleComplete : handleNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimaryFixed} />
            ) : (
              <>
                <Text style={styles.nextText}>{step === 2 ? 'Hoàn tất' : 'Tiếp tục'}</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimaryFixed} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  loadingText: { marginTop: 12, color: colors.onSurfaceVariant, fontFamily: 'Inter-Regular' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 52, paddingBottom: 36 },
  header: { marginBottom: 30 },
  brand: { color: colors.primaryFixed, fontFamily: 'Montserrat-ExtraBold', fontSize: 24 },
  stepText: { color: colors.onSurfaceVariant, fontFamily: 'Inter-Medium', fontSize: 12, marginTop: 14 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceVariant, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primaryFixed },
  section: { flex: 1 },
  title: { color: colors.onSurface, fontFamily: 'Montserrat-Bold', fontSize: 28, marginTop: 14 },
  subtitle: { color: colors.onSurfaceVariant, fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 24 },
  label: { color: colors.onSurfaceVariant, fontFamily: 'Inter-SemiBold', fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { height: 54, borderRadius: 14, paddingHorizontal: 16, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, color: colors.onSurface, fontFamily: 'Inter-Regular', fontSize: 16 },
  inputButton: { height: 54, borderRadius: 14, paddingHorizontal: 16, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputButtonText: { color: colors.onSurface, fontFamily: 'Inter-Medium', fontSize: 15 },
  dateDoneButton: { alignSelf: 'flex-end', backgroundColor: colors.primaryFixed, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  dateDoneText: { color: colors.onPrimaryFixed, fontFamily: 'Inter-Bold' },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chipActive: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  chipText: { color: colors.onSurfaceVariant, fontFamily: 'Inter-SemiBold', fontSize: 13 },
  chipTextActive: { color: colors.onPrimaryFixed },
  measureRow: { flexDirection: 'row', gap: 12 },
  measureField: { flex: 1 },
  unitInput: { height: 70, borderRadius: 16, paddingHorizontal: 16, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center' },
  unitTextInput: { flex: 1, color: colors.onSurface, fontFamily: 'Montserrat-Bold', fontSize: 26, paddingVertical: 0 },
  unit: { color: colors.onSurfaceVariant, fontFamily: 'Inter-Medium', fontSize: 14 },
  infoCard: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 14, marginTop: 24, backgroundColor: 'rgba(198,243,51,0.08)', borderWidth: 1, borderColor: 'rgba(198,243,51,0.2)' },
  infoText: { flex: 1, color: colors.onSurfaceVariant, fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionCard: { width: '48%', minHeight: 78, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, justifyContent: 'space-between' },
  optionCardActive: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  optionTitle: { color: colors.onSurface, fontFamily: 'Inter-SemiBold', fontSize: 14, marginTop: 8 },
  optionTitleActive: { color: colors.onPrimaryFixed },
  activityList: { gap: 8 },
  activityCard: { minHeight: 58, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center' },
  activityCardActive: { borderColor: colors.primaryFixed, backgroundColor: 'rgba(198,243,51,0.08)' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryFixed },
  activityText: { marginLeft: 12 },
  activityTitle: { color: colors.onSurface, fontFamily: 'Inter-SemiBold', fontSize: 14 },
  activityDetail: { color: colors.onSurfaceVariant, fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 30 },
  backButton: { minHeight: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backText: { color: colors.onSurface, fontFamily: 'Inter-SemiBold' },
  nextButton: { flex: 1, minHeight: 54, borderRadius: 14, backgroundColor: colors.primaryFixed, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextText: { color: colors.onPrimaryFixed, fontFamily: 'Inter-Bold', fontSize: 16 },
});
