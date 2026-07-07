// Fixed merge conflicts and typos
import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fetchPrograms, getWorkoutHistory, getUserStreak } from '../lib/workoutService';
import { getProfile } from '../services/healthService';
import { generateWeeklyPlan, DayPlan } from '../lib/weeklyWorkoutUtils';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { Program, Profile } from '../types';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');

// --- Horizontal Calendar Component ---
type CalendarProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  weeklyPlan: DayPlan[];
  completedDays: string[]; 
};

const HorizontalCalendar = ({ selectedDate, onDateSelect, weeklyPlan, completedDays }: CalendarProps) => {
  return (
    <View style={styles.calendarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarList}
      >
        {weeklyPlan.map((day) => {
          const dateStr = day.date.toISOString().split('T')[0];
          const isCompleted = completedDays.includes(dateStr);
          const isSelected = day.date.toDateString() === selectedDate.toDateString();
          const isToday = day.date.toDateString() === new Date().toDateString();
          
          return (
            <TouchableOpacity 
              key={day.date.toISOString()}
              style={[
                styles.dayCard, 
                isSelected && styles.dayCardActive,
                !isSelected && isToday && { borderColor: colors.primaryFixed, borderWidth: 1 }
              ]}
              onPress={() => onDateSelect(day.date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                {day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>
                {day.date.getDate()}
              </Text>
              {isCompleted && (
                <View style={styles.checkIcon}>
                  <MaterialIcons name="check-circle" size={14} color={isSelected ? "#fff" : colors.primaryFixed} />
                </View>
              )}
              {day.isRestDay && !isCompleted && <View style={[styles.restDot, isSelected && { backgroundColor: '#fff' }]} />}
              {isToday && !isSelected && !isCompleted && <View style={[styles.todayDot, { backgroundColor: colors.primaryFixed }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

type Props = {
  onSelectProgram: (id: string) => void;
};

export default function ProgramsScreen({ onSelectProgram }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const handleScroll = useHideOnScroll();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [progData, profileData, history, streakVal] = await Promise.all([
          fetchPrograms(),
          getProfile(user.id).catch(() => null),
          getWorkoutHistory(user.id),
          getUserStreak(user.id)
        ]);
        setPrograms(progData);
        setProfile(profileData);
        setCompletedDays(history);
        setStreak(streakVal);
      } else {
        const progData = await fetchPrograms();
        setPrograms(progData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const weeklyPlan = useMemo(() => {
    return generateWeeklyPlan(
      (profile?.fitness_goal as any) || null,
      programs,
      new Date(),
      profile?.bmi || 22
    );
  }, [profile, programs]);

  const selectedDayPlan = useMemo(() => {
    return weeklyPlan.find(d => d.date.toDateString() === selectedDate.toDateString());
  }, [selectedDate, weeklyPlan]);

  const ProgramItem = ({ program, isSuggested }: { program: Program, isSuggested?: boolean }) => (
    <TouchableOpacity 
      style={[styles.programCard, isSuggested && styles.suggestedCard]} 
      activeOpacity={0.9}
      onPress={() => onSelectProgram(program.id)}
    >
      <Image
        source={{ uri: program.thumbnail_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438' }}
        style={styles.thumbnail}
      />
      <View style={styles.programOverlay} />
      {isSuggested && (
        <View style={styles.suggestedBadge}>
          <Text style={styles.suggestedText}>GỢI Ý CHO BẠN</Text>
        </View>
      )}
      <View style={styles.programInfo}>
        <View style={[
          styles.levelBadge,
          program.level === 'Advanced'
            ? styles.levelAdvanced
            : program.level === 'Intermediate'
              ? styles.levelIntermediate
              : styles.levelBeginner,
        ]}>
          <Text style={styles.levelText}>{program.level}</Text>
        </View>
        <Text style={styles.programTitle}>{program.title}</Text>
      </View>
      <View style={styles.playBtn}>
        <MaterialIcons name="play-arrow" size={24} color={colors.onPrimaryFixed} />
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (selectedDayPlan?.isRestDay) {
      return (
        <View style={styles.restDayContainer}>
          <MaterialIcons name="event-seat" size={80} color={colors.primaryFixed} />
          <Text style={styles.restDayTitle}>Hôm nay là ngày nghỉ!</Text>
          <Text style={styles.restDaySub}>Hãy để cơ thể phục hồi để đạt hiệu quả tốt nhất.</Text>
          <Text style={styles.otherTitle}>Hoặc xem các chương trình khác:</Text>
          <FlatList
            data={programs}
            keyExtractor={(item) => 'other-' + item.id}
            renderItem={({ item }) => <ProgramItem program={item} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    }

    const suggestedProg = programs.find(p => p.id === selectedDayPlan?.suggestedProgramId);
    const otherProgs = programs.filter(p => p.id !== suggestedProg?.id);

    return (
      <View style={{ flex: 1 }}>
        {suggestedProg && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chương trình dành cho bạn</Text>
            <ProgramItem program={suggestedProg} isSuggested />
          </View>
        )}
        <Text style={styles.sectionTitle}>Tất cả chương trình</Text>
        <FlatList
          data={otherProgs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProgramItem program={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Lịch tập Cá nhân hóa</Text>
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={18} color="#FF9800" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </View>
        {profile && (
          <View style={styles.bmiInfo}>
            <Text style={styles.subtitle}>
              BMI: {profile.bmi} ({profile.bmi && profile.bmi > 25 ? 'Thừa cân' : profile.bmi && profile.bmi < 18.5 ? 'Gầy' : 'Cân đối'})
            </Text>
            <Text style={styles.goalText}>
              Mục tiêu: {profile.fitness_goal === 'lose_weight' ? 'Giảm cân' : 
                        profile.fitness_goal === 'build_muscle' ? 'Tăng cơ' : 
                        profile.fitness_goal === 'flexibility' ? 'Dẻo dai' : 'Duy trì'}
            </Text>
          </View>
        )}
      </View>

      <HorizontalCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate}
        weeklyPlan={weeklyPlan}
        completedDays={completedDays}
      />

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={colors.primaryFixed} />
        </View>
      ) : renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 15 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Montserrat-Bold', fontSize: 22, color: colors.onSurface },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 152, 0, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  streakText: { fontFamily: 'Montserrat-Bold', fontSize: 16, color: '#FF9800', marginLeft: 4 },
  bmiInfo: { marginTop: 4 },
  subtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.primaryFixed },
  goalText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  calendarContainer: { marginBottom: 20 },
  calendarList: { paddingHorizontal: 16, gap: 12 },
  dayCard: { width: 60, height: 85, backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginHorizontal: 4 },
  dayCardActive: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  dayName: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  dayNum: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: colors.onSurface, marginTop: 4 },
  dayTextActive: { color: colors.onPrimaryFixed },
  todayDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 8 },
  restDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.onSurfaceVariant, position: 'absolute', top: 8 },
  checkIcon: { position: 'absolute', top: 6, right: 6 },
  section: { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontFamily: 'Montserrat-Bold', fontSize: 16, color: colors.onSurface, marginBottom: 12, paddingHorizontal: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  programCard: { height: 180, borderRadius: 24, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.surfaceContainerHigh },
  suggestedCard: { borderWidth: 2, borderColor: colors.primaryFixed },
  thumbnail: { width: '100%', height: '100%' },
  programOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  suggestedBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: colors.primaryFixed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, zIndex: 10 },
  suggestedText: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.onPrimaryFixed },
  programInfo: { position: 'absolute', bottom: 20, left: 20, right: 70 },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  levelBeginner: { backgroundColor: '#4ade80' },
  levelIntermediate: { backgroundColor: '#fbbf24' },
  levelAdvanced: { backgroundColor: '#f87171' },
  levelText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#000', textTransform: 'uppercase' },
  programTitle: { fontFamily: 'Montserrat-Bold', fontSize: 18, color: '#fff' },
  playBtn: { position: 'absolute', right: 20, bottom: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFixed, justifyContent: 'center', alignItems: 'center' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  restDayContainer: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  restDayTitle: { fontFamily: 'Montserrat-Bold', fontSize: 22, color: colors.onSurface, marginTop: 20 },
  restDaySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 10, marginBottom: 30 },
  otherTitle: { alignSelf: 'flex-start', fontFamily: 'Montserrat-Bold', fontSize: 16, color: colors.onSurface, marginBottom: 15 },
});
