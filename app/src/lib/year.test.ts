import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getYearProgress } from './year.ts';

describe('Year Progress Utilities (TZ=Asia/Kolkata)', () => {
  test('Jan 1 2026 -> dayOfYear 1, daysRemaining 365, pct 0', () => {
    const jan1 = new Date(2026, 0, 1, 10, 30, 0);
    const yp = getYearProgress(jan1);

    assert.equal(yp.year, 2026);
    assert.equal(yp.totalDays, 365);
    assert.equal(yp.dayOfYear, 1);
    assert.equal(yp.daysRemaining, 365);
    assert.equal(yp.pct, 0);
    assert.equal(yp.pctDisplay, '0.0');
    assert.equal(yp.monthsRemaining, 11);
  });

  test('Dec 31 2026 -> dayOfYear 365, daysRemaining 1, pct ~99.7', () => {
    const dec31 = new Date(2026, 11, 31, 23, 59, 0);
    const yp = getYearProgress(dec31);

    assert.equal(yp.year, 2026);
    assert.equal(yp.totalDays, 365);
    assert.equal(yp.dayOfYear, 365);
    assert.equal(yp.daysRemaining, 1, 'Dec 31 must return 1 day remaining, not 0');
    assert.ok(yp.pct > 99.7 && yp.pct < 99.8, `Expected pct ~99.7, got ${yp.pct}`);
    assert.equal(yp.pctDisplay, '99.7');
    assert.equal(yp.monthsRemaining, 0);
  });

  test('Feb 29 2028 (leap year) -> totalDays 366, dayOfYear 60', () => {
    const feb29 = new Date(2028, 1, 29, 12, 0, 0);
    const yp = getYearProgress(feb29);

    assert.equal(yp.year, 2028);
    assert.equal(yp.totalDays, 366, 'Leap year 2028 must have 366 total days');
    assert.equal(yp.dayOfYear, 60, 'Feb 29 must be day 60 (31 in Jan + 29 in Feb)');
    assert.equal(yp.daysRemaining, 307);
    assert.equal(yp.monthsRemaining, 10);
  });

  test('Aug 16 2026 -> monthsRemaining 4 (Sep, Oct, Nov, Dec)', () => {
    const aug16 = new Date(2026, 7, 16, 14, 0, 0);
    const yp = getYearProgress(aug16);

    assert.equal(yp.year, 2026);
    assert.equal(yp.dayOfYear, 228); // 31+28+31+30+31+30+31+16 = 228
    assert.equal(yp.daysRemaining, 138); // 365 - 228 + 1 = 138
    assert.equal(yp.monthsRemaining, 4, 'Aug 16 must have 4 whole months remaining (Sep, Oct, Nov, Dec)');
  });

  test('Fake timers / default current date invocation', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 7, 16, 12, 0, 0).getTime() });
    
    const yp = getYearProgress();
    assert.equal(yp.year, 2026);
    assert.equal(yp.dayOfYear, 228);
    assert.equal(yp.daysRemaining, 138);
    assert.equal(yp.monthsRemaining, 4);
  });
});
