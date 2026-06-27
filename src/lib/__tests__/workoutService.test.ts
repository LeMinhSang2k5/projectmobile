import { calculateCalories } from '../workoutCalculations';
import { addLocalDays, toLocalDateString } from '../dateUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

assert(calculateCalories(8, 70, 1800) === 294, 'MET calories');
assert(calculateCalories(5, 60, 0) === 0, 'zero duration');
assert(calculateCalories(0, 60, 600) === 0, 'zero MET');
assert(calculateCalories(5, -1, 600) === 0, 'invalid weight');

const localMidnight = new Date(2026, 5, 28, 0, 30);
assert(toLocalDateString(localMidnight) === '2026-06-28', 'local date must not use UTC');
assert(
  toLocalDateString(addLocalDays(localMidnight, -1)) === '2026-06-27',
  'previous local day',
);

console.log('All workout calculation tests passed.');
