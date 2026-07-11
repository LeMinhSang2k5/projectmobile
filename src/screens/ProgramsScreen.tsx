// Final Standardized Module 2: BMI + Diverse Suggestions + Strict Streak + 5 Programs Guarantee
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fetchPrograms, getWorkoutHistory, getUserStreak } from '../lib/workoutService';
import { getProfile } from '../services/healthService';
import { generateWeeklyPlan, DayPlan } from '../lib/weeklyWorkoutUtils';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { Program, Profile } from '../types';
import { supabase } from '../../utils/supabase';
import { toLocalDateString } from '../lib/dateUtils';

const { width } = Dimensions.get('window');

type CalendarProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  weeklyPlan: DayPlan[];
  completedDays: string[]; 
};

const HorizontalCalendar = ({ selectedDate, onDateSelect, weeklyPlan, completedDays }: CalendarProps) => {
  const todayStr = toLocalDateString();

  return (
    <View style={styles.calendarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarList}>
        {weeklyPlan.map((day) => {
          const dateStr = toLocalDateString(day.date);
          const isFuture = dateStr > todayStr;
          const isCompleted = !day.isRestDay && !isFuture && completedDays.includes(dateStr);
          const isSelected = day.date.toDateString() === selectedDate.toDateString();
          const isToday = day.date.toDateString() === new Date().toDateString();
          
          return (
            <TouchableOpacity 
              key={day.date.toISOString()}
              style={[
                styles.dayCard, 
                isSelected && styles.dayCardActive,
                !isSelected && isToday && { borderColor: colors.primaryFixed, borderWidth: 2 },
                day.isRestDay && !isSelected && { backgroundColor: 'rgba(255,255,255,0.03)' }
              ]}
              onPress={() => onDateSelect(day.date)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextActive, day.isRestDay && !isSelected && { color: 'rgba(255,255,255,0.3)' }]}>
                {day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayTextActive, day.isRestDay && !isSelected && { color: 'rgba(255,255,255,0.3)' }]}>
                {day.date.getDate()}
              </Text>
              {day.isRestDay && !isSelected && (
                <MaterialIcons name="coffee" size={12} color="rgba(255,255,255,0.2)" style={{ marginTop: 2 }} />
              )}
              {isCompleted && (
                <View style={styles.checkIcon}>
                  <MaterialIcons name="check-circle" size={16} color={isSelected ? "#fff" : colors.primaryFixed} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

type Props = {
  onSelectProgram: (id: string, date: Date) => void;
  refreshKey?: number;
};

export default function ProgramsScreen({ onSelectProgram, refreshKey }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [dbStreak, setDbStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const handleScroll = useHideOnScroll();

  const loadInitialData = async (isRefreshing = false) => {
    if (!isRefreshing && programs.length === 0) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [progData, profileData, history, streakVal] = await Promise.all([
          fetchPrograms(),
          getProfile(user.id).catch(() => null),
          getWorkoutHistory(user.id),
          getUserStreak(user.id),
        ]);
        
        setPrograms(progData);
        setProfile(profileData);
        setCompletedDays(history || []);
        setDbStreak(streakVal);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [refreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData(true);
  }, [refreshKey]);

  const bmiInfo = useMemo(() => {
    const bmi = profile?.bmi || 0;
    if (bmi === 0) return { label: 'Chưa có dữ liệu', color: colors.onSurfaceVariant };
    if (bmi < 18.5) return { label: 'Cân nặng thấp', color: '#64b5f6' };
    if (bmi < 25) return { label: 'Bình thường', color: '#4ade80' };
    if (bmi < 30) return { label: 'Tiền béo phì', color: '#ffb74d' };
    return { label: 'Béo phì', color: '#ff5252' };
  }, [profile]);

  const weeklyPlan = useMemo(() => {
    return generateWeeklyPlan(profile?.fitness_goal as any || null, programs, new Date(), profile?.bmi || 22);
  }, [profile, programs]);

  const planStats = useMemo(() => {
    const workoutDays = weeklyPlan.filter(d => !d.isRestDay).length;
    const todayPlan = weeklyPlan.find(d => d.date.toDateString() === new Date().toDateString());
    
    let todayStatus = "Tập luyện";
    if (todayPlan?.isRestDay) {
      todayStatus = "Nghỉ ngơi ☕";
    } else {
      const dayIdx = (new Date().getDay() + 6) % 7; 
      if (dayIdx === 0 || dayIdx === 3) todayStatus = "Tập nặng 🔥";
      else if (dayIdx === 6) todayStatus = "Tập nhẹ 🌿";
      else todayStatus = "Tập vừa 💪";
    }

    return { workoutDays, todayStatus };
  }, [weeklyPlan]);

  const selectedDayPlan = useMemo(() => {
    return weeklyPlan.find(d => d.date.toDateString() === selectedDate.toDateString());
  }, [selectedDate, weeklyPlan]);

  // LOGIC SẮP XẾP BÀI TẬP: KHÔNG LÀM MẤT BÀI
  const sortedPrograms = useMemo(() => {
    if (programs.length === 0) return [];
    
    const suggestedId = selectedDayPlan?.suggestedProgramId;
    if (!suggestedId) return programs;

    // Tìm vị trí bài gợi ý
    const suggestedIdx = programs.findIndex(p => p.id === suggestedId);
    if (suggestedIdx === -1) return programs;

    // Đưa bài gợi ý lên đầu mà không dùng filter (tránh mất bài nếu trùng ID)
    const result = [...programs];
    const [suggestedItem] = result.splice(suggestedIdx, 1);
    result.unshift(suggestedItem);
    
    return result;
  }, [programs, selectedDayPlan]);

  const handleProgramPress = (id: string) => {
    const todayStr = toLocalDateString();
    const targetStr = toLocalDateString(selectedDate);
    if (targetStr > todayStr) {
      Alert.alert("Thông báo", "Bạn không thể thực hiện bài tập cho ngày tương lai.");
      return;
    }
    onSelectProgram(id, selectedDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Lịch tập</Text>
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={20} color="#FF9800" />
            <Text style={styles.streakText}>{dbStreak}</Text> 
          </View>
        </View>

        <View style={styles.bmiCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Chỉ số BMI</Text>
            <Text style={styles.bmiValueText}>{profile?.bmi ? profile.bmi.toFixed(1) : '--'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={{ alignItems: 'flex-end', flex: 1.5 }}>
            <Text style={[styles.bmiStatusText, { color: bmiInfo.color }]}>
              {bmiInfo.label}
            </Text>
            <Text style={styles.infoLabel}>Trạng thái cơ thể</Text>
          </View>
        </View>

        <View style={styles.planSummaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="event-available" size={16} color={colors.primaryFixed} />
            <Text style={styles.summaryText}>Lịch tuần: <Text style={styles.boldText}>{planStats.workoutDays} ngày tập</Text></Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="list" size={16} color={colors.primaryFixed} />
            <Text style={styles.summaryText}>Hiển thị: <Text style={[styles.boldText, programs.length < 5 && { color: '#ff5252' }]}>{programs.length} chương trình</Text></Text>
          </View>
        </View>
      </View>

      <HorizontalCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} weeklyPlan={weeklyPlan} completedDays={completedDays} />

      {loading ? (
        <View style={styles.loadingArea}><ActivityIndicator size="large" color={colors.primaryFixed} /></View>
      ) : (
        <FlatList
          data={sortedPrograms}
          keyExtractor={(item, index) => item.id + index} // Đảm bảo key luôn duy nhất
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryFixed]} tintColor={colors.primaryFixed} />
          }
          ListHeaderComponent={selectedDayPlan?.isRestDay ? (
            <View style={styles.restDayMessage}>
              <MaterialIcons name="spa" size={48} color={colors.primaryFixed} />
              <Text style={styles.restDayTitle}>Hôm nay là ngày nghỉ ngơi</Text>
              <Text style={styles.restDaySubtitle}>Hãy để cơ bắp phục hồi. Danh sách bài tập vẫn hiển thị bên dưới để bạn tham khảo.</Text>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const isSuggested = item.id === selectedDayPlan?.suggestedProgramId;
            return (
              <TouchableOpacity 
                style={[styles.programCard, isSuggested && styles.suggestedCard]} 
                onPress={() => handleProgramPress(item.id)}
              >
                <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
                <View style={styles.programOverlay} />
                {isSuggested && (
                  <View style={styles.suggestedBadge}>
                    <MaterialIcons name="star" size={12} color={colors.onPrimaryFixed} />
                    <Text style={styles.suggestedText}>GỢI Ý TỐT NHẤT</Text>
                  </View>
                )}
                <View style={styles.programInfo}>
                  <Text style={[styles.programTitle, isSuggested && { color: colors.primaryFixed, fontSize: 19 }]}>{item.title}</Text>
                  <Text style={styles.levelText}>{item.level}</Text>
                </View>
                <View style={styles.playBtn}><MaterialIcons name="play-arrow" size={24} color={colors.onPrimaryFixed} /></View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Montserrat-Bold', fontSize: 24, color: colors.onSurface },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 152, 0, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  streakText: { fontFamily: 'Montserrat-Bold', fontSize: 18, color: '#FF9800', marginLeft: 4 },
  bmiCard: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 2 },
  infoLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  bmiValueText: { fontFamily: 'Montserrat-Bold', fontSize: 26, color: colors.primaryFixed, marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
  bmiStatusText: { fontFamily: 'Montserrat-Bold', fontSize: 18, textAlign: 'right' },
  planSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.onSurfaceVariant },
  boldText: { color: colors.onSurface, fontFamily: 'Inter-Bold' },
  calendarContainer: { marginVertical: 10 },
  calendarList: { paddingHorizontal: 16, gap: 10 },
  dayCard: { width: 60, height: 85, backgroundColor: colors.surfaceContainerHigh, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayCardActive: { backgroundColor: colors.primaryFixed },
  dayName: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  dayNum: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: colors.onSurface, marginTop: 4 },
  dayTextActive: { color: colors.onPrimaryFixed },
  checkIcon: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.surface, borderRadius: 10, padding: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  restDayMessage: { alignItems: 'center', padding: 30, backgroundColor: colors.surfaceContainerLow, borderRadius: 24, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primaryFixed },
  restDayTitle: { fontFamily: 'Montserrat-Bold', fontSize: 18, color: colors.onSurface, marginTop: 12 },
  restDaySubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  programCard: { height: 150, borderRadius: 24, overflow: 'hidden', marginBottom: 15 },
  suggestedCard: { height: 180, borderWidth: 3, borderColor: colors.primaryFixed, elevation: 8, shadowColor: colors.primaryFixed, shadowOpacity: 0.3, shadowRadius: 10 },
  thumbnail: { width: '100%', height: '100%' },
  programOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  suggestedBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.primaryFixed, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestedText: { fontFamily: 'Inter-Bold', fontSize: 9, color: colors.onPrimaryFixed },
  programInfo: { position: 'absolute', bottom: 15, left: 20 },
  programTitle: { fontFamily: 'Montserrat-Bold', fontSize: 17, color: '#fff' },
  levelText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  playBtn: { position: 'absolute', right: 20, bottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryFixed, justifyContent: 'center', alignItems: 'center' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
