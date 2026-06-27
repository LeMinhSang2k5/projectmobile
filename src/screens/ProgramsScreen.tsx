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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fetchPrograms } from '../lib/workoutService';
import { Program } from '../types';

const { width } = Dimensions.get('window');

// --- Horizontal Calendar Component ---
type CalendarProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
};

const HorizontalCalendar = ({ selectedDate, onDateSelect }: CalendarProps) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    // Hiển thị 7 ngày (3 ngày trước, hôm nay, 3 ngày sau)
    for (let i = -3; i <= 3; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      result.push(date);
    }
    return result;
  }, []);

  return (
    <View style={styles.calendarContainer}>
      <FlatList
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.toISOString()}
        contentContainerStyle={styles.calendarList}
        renderItem={({ item }) => {
          const isSelected = item.toDateString() === selectedDate.toDateString();
          const isToday = item.toDateString() === new Date().toDateString();
          
          return (
            <TouchableOpacity 
              style={[
                styles.dayCard, 
                isSelected && styles.dayCardActive,
                !isSelected && isToday && { borderColor: colors.primaryFixed, borderWidth: 1 }
              ]}
              onPress={() => onDateSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                {item.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>
                {item.getDate()}
              </Text>
              {isToday && !isSelected && <View style={[styles.todayDot, { backgroundColor: colors.primaryFixed }]} />}
              {isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

type Props = {
  onSelectProgram: (id: string) => void;
};

export default function ProgramsScreen({ onSelectProgram }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForceOffline, setShowForceOffline] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadPrograms();
    const timer = setTimeout(() => {
      if (loading) setShowForceOffline(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await fetchPrograms();
      setPrograms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const useOfflineData = () => {
    const mock: Program[] = [{
      id: 'mock-p1',
      title: 'Chương trình Offline (Dự phòng)',
      description: 'Dành cho trường hợp mạng lỗi',
      level: 'Beginner',
      thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      created_at: new Date().toISOString()
    }];
    setPrograms(mock);
    setLoading(false);
  };

  const ProgramItem = ({ program }: { program: Program }) => (
    <TouchableOpacity 
      style={styles.programCard} 
      activeOpacity={0.9}
      onPress={() => onSelectProgram(program.id)}
    >
      <Image
        source={{ uri: program.thumbnail_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438' }}
        style={styles.thumbnail}
      />
      <View style={styles.programOverlay} />
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch tập & Chương trình</Text>
      </View>

      <HorizontalCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate} 
      />

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={colors.primaryFixed} />
          <Text style={styles.statusText}>Đang kết nối dữ liệu...</Text>
          {showForceOffline && (
            <TouchableOpacity style={styles.forceBtn} onPress={useOfflineData}>
              <Text style={styles.forceBtnText}>SỬ DỤNG DỮ LIỆU DỰ PHÒNG (OFFLINE)</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProgramItem program={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
  title: { fontFamily: 'Montserrat-Bold', fontSize: 22, color: colors.onSurface },
  calendarContainer: { marginBottom: 24 },
  calendarList: { paddingHorizontal: 16, gap: 12 },
  dayCard: { width: 60, height: 80, backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginHorizontal: 6 },
  dayCardActive: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  dayName: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  dayNum: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: colors.onSurface, marginTop: 4 },
  dayTextActive: { color: colors.onPrimaryFixed },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.onPrimaryFixed, marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  programCard: { height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 20, backgroundColor: colors.surfaceContainerHigh },
  thumbnail: { width: '100%', height: '100%' },
  programOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  programInfo: { position: 'absolute', bottom: 20, left: 20, right: 70 },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  levelBeginner: { backgroundColor: '#4ade80' },
  levelIntermediate: { backgroundColor: '#fbbf24' },
  levelAdvanced: { backgroundColor: '#f87171' },
  levelText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#000', textTransform: 'uppercase' },
  programTitle: { fontFamily: 'Montserrat-Bold', fontSize: 20, color: '#fff' },
  playBtn: { position: 'absolute', right: 20, bottom: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryFixed, justifyContent: 'center', alignItems: 'center' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  statusText: { color: colors.onSurface, marginTop: 15, fontFamily: 'Inter-Medium' },
  forceBtn: { marginTop: 30, padding: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: colors.primaryFixed },
  forceBtnText: { color: colors.primaryFixed, fontFamily: 'Inter-Bold', fontSize: 12, textAlign: 'center' },
});
