import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../theme/colors';
import {
  fetchExercisesByProgram,
  logExercise,
  calculateCalories,
  completeWorkoutSession,
} from '../lib/workoutService';
import { getProfile } from '../services/healthService';
import { Exercise } from '../types';
import { toLocalDateString } from '../lib/dateUtils';

const { width } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438';

type Props = {
  programId: string;
  userId: string;
  onClose: () => void;
  onCompleted?: () => void;
  workoutDate?: Date; // Nhận ngày được chọn từ lịch tập
};

export default function WorkoutDetailScreen({ programId, userId, onClose, onCompleted, workoutDate }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [weightKg, setWeightKg] = useState(65);
  
  const processingRef = useRef(false);
  const loggedExerciseIdsRef = useRef(new Set<string>());

  // Chuyển đổi workoutDate sang string để lưu DB
  const targetDateStr = workoutDate ? toLocalDateString(workoutDate) : toLocalDateString();

  const currentExercise = exercises[currentIndex];
  const mediaUrl = currentExercise?.media_url || PLACEHOLDER;
  const isVideo = /\.(mp4|mov|m3u8|webm)(\?.*)?$/i.test(mediaUrl);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, profile] = await Promise.all([
        fetchExercisesByProgram(programId),
        getProfile(userId).catch(() => null),
      ]);
      if (data && data.length > 0) {
        setExercises(data);
        setTimer(data[0].duration);
        setWeightKg(profile?.weight_kg && profile.weight_kg > 0 ? profile.weight_kg : 65);
      } else {
        setError('Chương trình chưa có bài tập.');
      }
    } catch {
      setError('Không thể tải bài tập.');
    }
    finally { setLoading(false); }
  }, [programId, userId]);

  useEffect(() => { loadExercises(); }, [loadExercises]);

  const handleFinishWorkout = useCallback(async (calories: number) => {
    if (isFinished) return;
    setIsFinished(true);
    
    try {
      // Lưu vào ngày mục tiêu thay vì luôn lưu vào "hôm nay"
      const streak = await completeWorkoutSession(programId, calories, targetDateStr);
      
      Alert.alert(
        'Hoàn thành!',
        `Bạn đã hoàn thành bài tập cho ngày ${targetDateStr}.`,
        [{ text: 'Xong', onPress: () => { onCompleted?.(); onClose(); } }],
        { cancelable: false }
      );
    } catch (e) {
      setIsFinished(false);
      Alert.alert('Lỗi', 'Không thể lưu kết quả.');
    }
  }, [programId, onClose, onCompleted, isFinished, targetDateStr]);

  const completeCurrentExercise = useCallback(async () => {
    if (!currentExercise || processingRef.current || isFinished) return;
    processingRef.current = true;

    const calories = calculateCalories(currentExercise.met_value, weightKg, currentExercise.duration);

    try {
      if (!loggedExerciseIdsRef.current.has(currentExercise.id)) {
        await logExercise(userId, currentExercise.id, calories, targetDateStr);
        loggedExerciseIdsRef.current.add(currentExercise.id);
      }
      
      const newTotal = totalCalories + calories;
      setTotalCalories(newTotal);

      if (currentIndex < exercises.length - 1) {
        setIsResting(true);
        setTimer(15);
        processingRef.current = false;
      } else {
        await handleFinishWorkout(newTotal);
      }
    } catch (saveError) {
      processingRef.current = false;
      Alert.alert('Lỗi', 'Không thể lưu tiến trình.');
    }
  }, [currentExercise, weightKg, userId, totalCalories, currentIndex, exercises.length, handleFinishWorkout, isFinished, targetDateStr]);

  useEffect(() => {
    if (isPaused || timer <= 0 || isFinished) return;
    const timeout = setTimeout(() => setTimer((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [timer, isPaused, isFinished]);

  useEffect(() => {
    if (loading || isPaused || timer !== 0 || exercises.length === 0 || isFinished) return;
    if (isResting) {
      const nextIndex = currentIndex + 1;
      setIsResting(false);
      setCurrentIndex(nextIndex);
      setTimer(exercises[nextIndex].duration);
    } else {
      void completeCurrentExercise();
    }
  }, [timer, isPaused, isResting, loading, exercises, currentIndex, completeCurrentExercise, isFinished]);

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
          isVideo ? (
            <VideoView player={useVideoPlayer(mediaUrl, p => { p.loop = true; p.play(); })} style={styles.media} contentFit="contain" nativeControls={false} />
          ) : (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
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
});
