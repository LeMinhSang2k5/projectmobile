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

const { width } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438';

type ExerciseVideoProps = {
  uri: string;
  isPaused: boolean;
  onError: () => void;
};

function ExerciseVideo({ uri, isPaused, onError }: ExerciseVideoProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });

  useEffect(() => {
    if (isPaused) player.pause();
    else player.play();
  }, [isPaused, player]);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') onError();
  });

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

type Props = {
  programId: string;
  userId: string;
  onClose: () => void;
  onCompleted?: () => void;
};

export default function WorkoutDetailScreen({ programId, userId, onClose, onCompleted }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [weightKg, setWeightKg] = useState(65);
  const processingRef = useRef(false);
  const loggedExerciseIdsRef = useRef(new Set<string>());

  const currentExercise = exercises[currentIndex];
  const mediaUrl = currentExercise?.media_url || PLACEHOLDER;
  
  const isVideo = /\.(mp4|mov|m3u8|webm)(\?.*)?$/i.test(mediaUrl);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setTotalCalories(0);
    setIsResting(false);
    setIsPaused(false);
    loggedExerciseIdsRef.current.clear();
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
      setError('Không thể tải bài tập. Vui lòng kiểm tra kết nối và thử lại.');
    }
    finally { setLoading(false); }
  }, [programId, userId]);

  useEffect(() => { loadExercises(); }, [loadExercises]);

  const finishRest = useCallback(() => {
    const nextIndex = currentIndex + 1;
    const nextExercise = exercises[nextIndex];
    if (!nextExercise) return;
    setIsResting(false);
    setCurrentIndex(nextIndex);
    setTimer(nextExercise.duration);
    setMediaError(false);
  }, [currentIndex, exercises]);

  const completeCurrentExercise = useCallback(async () => {
    if (!currentExercise || processingRef.current) return;
    processingRef.current = true;

    const calories = calculateCalories(
      currentExercise.met_value,
      weightKg,
      currentExercise.duration,
    );

    try {
      const alreadyLogged = loggedExerciseIdsRef.current.has(currentExercise.id);
      if (!alreadyLogged) {
        await logExercise(userId, currentExercise.id, calories);
        loggedExerciseIdsRef.current.add(currentExercise.id);
      }
      const newTotal = alreadyLogged
        ? totalCalories
        : Math.round((totalCalories + calories) * 100) / 100;
      setTotalCalories(newTotal);

      if (currentIndex < exercises.length - 1) {
        setIsResting(true);
        setTimer(15);
      } else {
        const streak = await completeWorkoutSession(programId, newTotal);
        onCompleted?.();
        const streakMessage = streak ? ` Chuỗi hiện tại: ${streak} ngày.` : '';
        Alert.alert(
          'Hoàn thành!',
          `Bạn đã đốt cháy ${Math.round(newTotal)} kcal.${streakMessage}`,
          [{ text: 'Xong', onPress: onClose }],
        );
      }
    } catch (saveError) {
      setIsPaused(true);
      const message = saveError instanceof Error ? saveError.message : 'Không thể lưu buổi tập.';
      Alert.alert('Chưa lưu được kết quả', message, [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Thử lại', onPress: () => setIsPaused(false) },
      ]);
    } finally {
      processingRef.current = false;
    }
  }, [
    currentExercise,
    weightKg,
    userId,
    totalCalories,
    currentIndex,
    exercises.length,
    programId,
    onCompleted,
    onClose,
  ]);

  useEffect(() => {
    if (isPaused || timer <= 0) return;
    const timeout = setTimeout(() => setTimer((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [timer, isPaused]);

  useEffect(() => {
    if (loading || isPaused || timer !== 0 || exercises.length === 0) return;
    if (isResting) finishRest();
    else void completeCurrentExercise();
  }, [
    timer,
    isPaused,
    isResting,
    loading,
    exercises.length,
    finishRest,
    completeCurrentExercise,
  ]);

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primaryFixed} /></View>;

  if (error || !currentExercise) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error ?? 'Không tìm thấy bài tập.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadExercises}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeLink} onPress={onClose}>
          <Text style={styles.closeLinkText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          ) : isVideo ? (
            <ExerciseVideo
              key={mediaUrl}
              uri={mediaUrl}
              isPaused={isPaused}
              onError={() => setMediaError(true)}
            />
          ) : (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="contain"
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
  retryText: { color: colors.onPrimaryFixed, fontFamily: 'Inter-Bold' },
  closeLink: { padding: 12, marginTop: 4 },
  closeLinkText: { color: colors.onSurfaceVariant, fontFamily: 'Inter-Medium' },
});
