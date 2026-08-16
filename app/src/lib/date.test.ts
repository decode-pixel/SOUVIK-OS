import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  toLocalDate,
  today,
  parseLocalDate,
  startOfMonth,
  endOfMonth,
  addDays,
  isToday,
  isFuture
} from './date.ts';

describe('Local Timezone-Safe Date Utilities (TZ=Asia/Kolkata)', () => {
  test('toLocalDate at IST boundary hours: 00:15, 03:00, 05:29, 05:31, 14:00', () => {
    // Construct local Date instances on August 17, 2026 in the current runtime timezone
    const t0015 = new Date(2026, 7, 17, 0, 15, 0);
    const t0300 = new Date(2026, 7, 17, 3, 0, 0);
    const t0529 = new Date(2026, 7, 17, 5, 29, 0);
    const t0531 = new Date(2026, 7, 17, 5, 31, 0);
    const t1400 = new Date(2026, 7, 17, 14, 0, 0);

    // All must return '2026-08-17', NEVER the previous day '2026-08-16'
    assert.equal(toLocalDate(t0015), '2026-08-17', '00:15 IST must return local date');
    assert.equal(toLocalDate(t0300), '2026-08-17', '03:00 IST must return local date');
    assert.equal(toLocalDate(t0529), '2026-08-17', '05:29 IST must return local date');
    assert.equal(toLocalDate(t0531), '2026-08-17', '05:31 IST must return local date');
    assert.equal(toLocalDate(t1400), '2026-08-17', '14:00 IST must return local date');
  });

  test('today() returns current local date', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    assert.equal(today(), expected);
  });

  test('startOfMonth and endOfMonth across months & leap year', () => {
    // Jan 2026
    const jan = new Date(2026, 0, 15);
    assert.equal(startOfMonth(jan), '2026-01-01');
    assert.equal(endOfMonth(jan), '2026-01-31');

    // Feb 2026 (non-leap: 28 days)
    const febNonLeap = new Date(2026, 1, 10);
    assert.equal(startOfMonth(febNonLeap), '2026-02-01');
    assert.equal(endOfMonth(febNonLeap), '2026-02-28');

    // Feb 2028 (leap year: 29 days)
    const febLeap = new Date(2028, 1, 10);
    assert.equal(startOfMonth(febLeap), '2028-02-01');
    assert.equal(endOfMonth(febLeap), '2028-02-29');

    // Aug 2026
    const aug = new Date(2026, 7, 17);
    assert.equal(startOfMonth(aug), '2026-08-01');
    assert.equal(endOfMonth(aug), '2026-08-31');

    // Dec 2026 (must return 2026-12-01 → 2026-12-31)
    const dec = new Date(2026, 11, 25);
    assert.equal(startOfMonth(dec), '2026-12-01');
    assert.equal(endOfMonth(dec), '2026-12-31');
  });

  test('parseLocalDate parses YYYY-MM-DD at local midnight without UTC shift', () => {
    const parsed = parseLocalDate('2026-08-16');
    assert.equal(parsed.getDate(), 16);
    assert.equal(parsed.getMonth(), 7); // 0-indexed August
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getHours(), 0);
    assert.equal(toLocalDate(parsed), '2026-08-16');
  });

  test('addDays across month boundary and across Dec 31 -> Jan 1', () => {
    // Month boundary addition
    assert.equal(addDays('2026-08-30', 3), '2026-09-02');
    assert.equal(addDays('2026-09-02', -3), '2026-08-30');

    // Year boundary addition: Dec 31 -> Jan 1
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2027-01-01', -1), '2026-12-31');

    // Leap year boundary addition
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2028-02-28', 2), '2028-03-01');
  });

  test('isToday and isFuture', () => {
    const currentToday = today();
    const yesterday = addDays(currentToday, -1);
    const tomorrow = addDays(currentToday, 1);

    assert.equal(isToday(currentToday), true);
    assert.equal(isToday(yesterday), false);
    assert.equal(isToday(tomorrow), false);

    assert.equal(isFuture(tomorrow), true);
    assert.equal(isFuture(currentToday), false);
    assert.equal(isFuture(yesterday), false);
  });
});
