export function calculateCalories(
  met: number,
  weightKg: number,
  durationSeconds: number,
): number {
  if (met <= 0 || weightKg <= 0 || durationSeconds <= 0) return 0;
  return Math.round((met * 3.5 * weightKg / 200) * (durationSeconds / 60) * 100) / 100;
}
