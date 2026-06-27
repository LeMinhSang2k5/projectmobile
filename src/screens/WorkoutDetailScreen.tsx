import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { colors } from '../theme/colors';
import { fetchExercisesByProgram, logExercise, calculateCalories } from '../lib/workoutService';
import { Exercise } from '../types';

const { width } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438';

type Props = {
  programId: string;
  userId: string;
  onClose: () => void;
};

export default function WorkoutDetailScreen({ programId, userId, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mediaError, setMediaError] = useState(false);

  const currentExercise = exercises[currentIndex];
  const mediaUrl = currentExercise?.media_url || PLACEHOLDER;
  
  // Kiểm tra đuôi file để quyết định dùng Image hay Video
  const isGif = mediaUrl.toLowerCase().includes('.gif') || 
                mediaUrl.toLowerCase().includes('.webp') ||
                mediaUrl.includes('giphy.com');

  useEffect(() => { loadExercises(); }, [programId]);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExercisesByProgram(programId);
      if (data && data.length > 0) {
        setExercises(data);
        setTimer(data[0].duration);
      } else {
        setError('Chương trình chưa có bài tập.');
      }
    } catch (err) { setError('Lỗi kết nối.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && exercises.length > 0) {
      handleNext();
    }
    return () => clearInterval(interval);
  }, [timer, isPaused]);

  const handleNext = async () => {
    if (!currentExercise) return;
    const calories = calculateCalories(currentExercise.met_value, 65, currentExercise.duration);
    setTotalCalories(prev => prev + calories);
    try { await logExercise(userId, currentExercise.id, calories); } catch (err) {}

    if (currentIndex < exercises.length - 1) {
      if (!isResting) {
        setIsResting(true);
        setTimer(15); 
      } else {
        setIsResting(false);
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setTimer(exercises[nextIdx].duration);
        setMediaError(false);
      }
    } else {
      Alert.alert('Hoàn thành!', `Bạn đã đốt cháy ${Math.round(totalCalories + calories)} kcal.`, [{ text: 'Xong', onPress: onClose }]);
    }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primaryFixed} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={28} color={colors.onSurface} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isResting ? 'Nghỉ ngơi' : `Bài tập ${currentIndex + 1}/${exercises.length}`}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mediaContainer}>
        {isResting ? (
          <View style={styles.restContainer}>
            <MaterialIcons name="event-seat" size={80} color={colors.primaryFixed} />
            <Text style={styles.restText}>Tiếp theo: {exercises[currentIndex + 1]?.name}</Text>
          </View>
        ) : (
          mediaError ? (
            <View style={styles.errorMedia}>
              <MaterialIcons name="error-outline" size={48} color={colors.onSurfaceVariant} />
              <Text style={styles.errorMediaText}>Link bài tập bị lỗi hoặc đã hết hạn</Text>
              <Text style={styles.hintText}>Vui lòng cập nhật Public URL từ Supabase Storage</Text>
            </View>
          ) : isGif ? (
            <Image 
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="contain"
              onError={() => setMediaError(true)}
            />
          ) : (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused}
              isLooping
              onError={() => setMediaError(true)}
            />
          )
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.exerciseName}>{isResting ? 'Chuẩn bị bài tiếp theo' : currentExercise?.name}</Text>
        
        <View style={styles.timerSection}>
          <View style={[styles.timerCircle, isResting && { borderColor: '#64b5f6' }]}>
            <Text style={styles.timerNumber}>{timer}</Text>
            <Text style={styles.timerUnit}>giây</Text>
          </View>

          <View style={styles.controls}>
            {isResting ? (
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#64b5f6', width: 220 }]} onPress={() => setTimer(0)}>
                <Text style={styles.skipText}>BỎ QUA NGHỈ NGƠI</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.controlBtn} onPress={() => setIsPaused(!isPaused)}>
                  <MaterialIcons name={isPaused ? "play-arrow" : "pause"} size={32} color={colors.onPrimaryFixed} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceVariant }]} onPress={() => setTimer(0)}>
                  <MaterialIcons name="skip-next" size={32} color={colors.primaryFixed} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontFamily: 'Montserrat-Bold', fontSize: 18, color: colors.onSurface },
  mediaContainer: { width: width, height: width * 0.7, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: '100%' },
  errorMedia: { alignItems: 'center', padding: 20 },
  errorMediaText: { color: '#ff6b6b', marginTop: 10, fontFamily: 'Inter-Bold' },
  hintText: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4, textAlign: 'center' },
  restContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1c1c' },
  restText: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.primaryFixed, marginTop: 16 },
  content: { flex: 1, padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.surface, marginTop: -20 },
  exerciseName: { fontFamily: 'Montserrat-Bold', fontSize: 24, color: colors.onSurface, marginBottom: 20, textAlign: 'center' },
  timerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timerCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 8, borderColor: colors.primaryFixed, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  timerNumber: { fontFamily: 'Montserrat-Bold', fontSize: 48, color: colors.onSurface },
  timerUnit: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.onSurfaceVariant },
  controls: { flexDirection: 'row', gap: 24 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryFixed, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  skipText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#fff' },
  errorText: { color: colors.onSurfaceVariant, textAlign: 'center' },
  retryBtn: { padding: 12, backgroundColor: colors.primaryFixed, borderRadius: 12, marginTop: 10 },
  retryText: { color: colors.onPrimaryFixed, fontFamily: 'Inter-Bold' }
});
