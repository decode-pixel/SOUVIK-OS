import { parseLocalDate, today } from './dateUtils';

/**
 * Given an array of date strings (YYYY-MM-DD) when a habit was completed,
 * calculates the current streak and longest streak.
 * 
 * @param {string[]} completedDates - Array of YYYY-MM-DD strings. Must be unique and sorted.
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
export function calculateStreaks(completedDates) {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Ensure sorted oldest to newest
  const sortedDates = [...completedDates].sort((a, b) => a.localeCompare(b));
  
  let longestStreak = 1;
  let currentRun = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseLocalDate(sortedDates[i - 1]);
    const currDate = parseLocalDate(sortedDates[i]);
    
    // Calculate difference in days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    
    if (diffDays === 1) {
      // Consecutive day
      currentRun++;
    } else if (diffDays > 1) {
      // Streak broken
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
      currentRun = 1;
    }
    // If diffDays === 0, duplicate date, ignore
  }
  
  // Final check for longest streak
  if (currentRun > longestStreak) {
    longestStreak = currentRun;
  }
  
  // Now, is the current streak still active?
  // A streak is active if the last completed date is TODAY or YESTERDAY.
  const lastDateStr = sortedDates[sortedDates.length - 1];
  const lastDate = parseLocalDate(lastDateStr);
  const todayDate = parseLocalDate(today());
  
  const daysSinceLastActivity = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
  
  let currentStreak = 0;
  if (daysSinceLastActivity <= 1) {
    // Streak is alive (completed today or yesterday)
    currentStreak = currentRun;
  }
  
  return { currentStreak, longestStreak };
}

/**
 * Filter raw habit logs down to just an array of completed date strings.
 */
export function getCompletedDates(logs, habitId, habitType) {
  return logs
    .filter(log => log.habit_id === habitId)
    .filter(log => {
      if (habitType === 'boolean') return Boolean(log.value_bool);
      if (habitType === 'count') return Number(log.value_count) > 0;
      return false;
    })
    .map(log => log.date);
}
