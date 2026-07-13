/**
 * Theo doi luong nuoc hom nay - dung trong StatsGrid tren Dashboard.
 * Hien thanh tien do, nut +250ml/+500ml; co keo truc tiep tren thanh.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getRemainingWaterMl, getWaterLimitStatus } from '../lib/limitWarnings';
import LimitAdjustHint from './LimitAdjustHint';

type Props = {
  waterMl: number;
  waterGoalMl: number;
  onAddWater: (ml: number) => void;
  onSetWaterMl?: (ml: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onSetWaterToGoal?: () => void;
  compact?: boolean;
};

/** Hien thi ml da uong, tien do %, nut them nuoc; keo thanh de chinh truc tiep */
export default function WaterTracker({
  waterMl,
  waterGoalMl,
  onAddWater,
  onSetWaterMl,
  onDragStateChange,
  onSetWaterToGoal,
  compact = false,
}: Props) {
  const STEP_ML = 50;
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValueMl, setDragValueMl] = useState<number | null>(null);
  const trackLeftRef = useRef(0);
  const trackWidthRef = useRef(0);
  const trackRef = useRef<View>(null);
  const waterMlRef = useRef(waterMl);
  const waterGoalMlRef = useRef(waterGoalMl);
  const onSetWaterMlRef = useRef(onSetWaterMl);
  const onDragStateChangeRef = useRef(onDragStateChange);
  const canDirectDragRef = useRef(false);

  /** Đồng bộ ref với props mới nhất để PanResponder luôn dùng giá trị hiện tại khi kéo. */
  useEffect(() => {
    waterMlRef.current = waterMl;
    waterGoalMlRef.current = waterGoalMl;
    onSetWaterMlRef.current = onSetWaterMl;
    onDragStateChangeRef.current = onDragStateChange;
    canDirectDragRef.current = !!onSetWaterMl && waterGoalMl > 0;
  }, [onSetWaterMl, onDragStateChange, waterGoalMl, waterMl]);

  const effectiveWaterMl = dragValueMl ?? waterMl;
  const limit = getWaterLimitStatus(effectiveWaterMl, waterGoalMl);
  const remainingMl = getRemainingWaterMl(effectiveWaterMl, waterGoalMl);
  const progress = waterGoalMl > 0 ? Math.min(effectiveWaterMl / waterGoalMl, 1) : 0;
  const percent = limit.percent;
  const fillColor = '#64b5f6';
  const canDirectDrag = !!onSetWaterMl && waterGoalMl > 0;
  const thumbLeft = trackWidth > 0 ? Math.min((progress * trackWidth), trackWidth) : 0;

  /** Đo vị trí và chiều rộng thanh tiến độ trên màn hình (cần cho tính toán khi kéo). */
  const measureTrack = (callback?: () => void) => {
    if (!trackRef.current) {
      callback?.();
      return;
    }

    trackRef.current.measureInWindow((x: number, _y: number, width: number) => {
      trackLeftRef.current = x;
      trackWidthRef.current = width;
      if (width > 0 && width !== trackWidth) {
        setTrackWidth(width);
      }
      callback?.();
    });
  };

  /** Chuyển tọa độ ngón tay thành lượng nước (ml), làm tròn theo bước 50ml và giới hạn trong mục tiêu. */
  const clampAndSnapMl = (pageX: number) => {
    const width = trackWidthRef.current;
    const goalMl = waterGoalMlRef.current;
    if (width <= 0 || goalMl <= 0) return waterMlRef.current;
    const localX = pageX - trackLeftRef.current;
    const clampedX = Math.max(0, Math.min(localX, width));
    const ratio = clampedX / width;
    const rawMl = ratio * goalMl;
    const snappedMl = Math.round(rawMl / STEP_ML) * STEP_ML;
    return Math.max(0, Math.min(snappedMl, goalMl));
  };

  /** Kết thúc kéo: xóa giá trị tạm và gọi `onSetWaterMl` nếu lượng nước thay đổi. */
  const commitDrag = (nextMl: number) => {
    setDragValueMl(null);
    onDragStateChangeRef.current?.(false);
    const setWater = onSetWaterMlRef.current;
    if (!setWater) return;
    if (nextMl !== waterMlRef.current) {
      setWater(nextMl);
    }
  };

  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDirectDragRef.current,
      onStartShouldSetPanResponderCapture: () => canDirectDragRef.current,
      onMoveShouldSetPanResponder: () => canDirectDragRef.current,
      onMoveShouldSetPanResponderCapture: () => canDirectDragRef.current,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        onDragStateChangeRef.current?.(true);
        measureTrack(() => {
          const nextMl = clampAndSnapMl(event.nativeEvent.pageX);
          setDragValueMl(nextMl);
        });
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const nextMl = clampAndSnapMl(event.nativeEvent.pageX);
        setDragValueMl(nextMl);
      },
      onPanResponderRelease: (event: GestureResponderEvent) => {
        const nextMl = clampAndSnapMl(event.nativeEvent.pageX);
        commitDrag(nextMl);
      },
      onPanResponderTerminate: () => {
        setDragValueMl(null);
        onDragStateChangeRef.current?.(false);
      },
    }),
  ).current;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>LƯỢNG NƯỚC</Text>
          <Text style={styles.count}>
            <Text style={styles.countHighlight}>{effectiveWaterMl}</Text>
            <Text style={styles.countGoal}> / {waterGoalMl} ml</Text>
          </Text>
        </View>
        <MaterialIcons name="water-drop" size={compact ? 28 : 32} color={fillColor} />
      </View>

      <View
        style={canDirectDrag ? styles.progressTouchArea : undefined}
        {...(canDirectDrag ? dragPanResponder.panHandlers : {})}
      >
        <View
          ref={trackRef}
          style={[
            styles.progressBg,
            canDirectDrag && styles.progressBgDraggable,
          ]}
          onLayout={(event: LayoutChangeEvent) => {
            const width = event.nativeEvent.layout.width;
            trackWidthRef.current = width;
            setTrackWidth(width);
            measureTrack();
          }}
        >
          <View
            pointerEvents="none"
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: fillColor }]}
          />
          {canDirectDrag ? (
            <View pointerEvents="none" style={[styles.progressThumb, { left: thumbLeft - 8 }]} />
          ) : null}
        </View>
      </View>
      <Text style={styles.percentText}>
        {limit.isOver
          ? canDirectDrag
            ? `Vượt mục tiêu +${limit.excess} ml — kéo trực tiếp trên thanh để điều chỉnh`
            : `Vượt mục tiêu +${limit.excess} ml`
          : remainingMl > 0
            ? `Còn ${remainingMl} ml (${percent}% mục tiêu)`
            : `${percent}% mục tiêu`}
      </Text>

      {limit.isOver && !compact && onSetWaterToGoal ? (
        <LimitAdjustHint
          compact
          message={`Bạn đang uống thêm ${limit.excess} ml so với mục tiêu hôm nay.`}
          actionLabel="Đặt về mục tiêu"
          onAction={onSetWaterToGoal}
        />
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.8}
          onPress={() => onAddWater(250)}
        >
          <Text style={styles.btnSecondaryText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.8}
          onPress={() => onAddWater(500)}
        >
          <MaterialIcons name="add" size={18} color={colors.onPrimaryFixed} />
          <Text style={styles.btnPrimaryText}>+500ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  cardCompact: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  count: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  countHighlight: {
    color: '#64b5f6',
  },
  countGoal: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  progressBg: {
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressTouchArea: {
    justifyContent: 'center',
    minHeight: 36,
  },
  progressBgDraggable: {
    height: 14,
    borderRadius: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressThumb: {
    position: 'absolute',
    top: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.onPrimaryFixed,
    backgroundColor: '#64b5f6',
  },
  percentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  btnPrimaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.onPrimaryFixed,
  },
});
