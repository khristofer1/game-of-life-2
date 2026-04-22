// src/utils/timeFormat.ts

export const formatQuestDuration = (startDateStr: string, deadlineStr: string): string => {
  if (!startDateStr || !deadlineStr) return 'One-Time';

  const start = new Date(startDateStr).getTime();
  const end = new Date(deadlineStr).getTime();
  const diffInMs = end - start;

  // If the deadline is before the start date somehow
  if (diffInMs <= 0) return 'Expired';

  const diffInMinutes = diffInMs / (1000 * 60);
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Less than 1 hour
  if (diffInMinutes < 60) {
    const minutes = Math.round(diffInMinutes);
    return minutes === 1 ? '1 minute' : `${minutes} Minutes`;
  }
  
  // Less than 24 hours
  if (diffInHours < 24) {
    const hours = Math.round(diffInHours);
    return hours === 1 ? '1 Hour' : `${hours} Hours`;
  }
  
  // 1 to 6 days
  if (diffInDays < 7) {
    const days = Math.round(diffInDays);
    return days === 1 ? '1 Day' : `${days} Days`;
  }
  
  // 1 to 4 weeks
  if (diffInDays < 30) {
    const weeks = Math.round(diffInDays / 7);
    return weeks === 1 ? '1 Week' : `${weeks} Weeks`;
  }
  
  // 1 to 12 months
  if (diffInDays < 365) {
    const months = Math.round(diffInDays / 30.44); // 30.44 is average days in a month
    return months === 1 ? '1 Month' : `${months} Months`;
  }

  // 1+ years
  const years = Math.round(diffInDays / 365);
  return years === 1 ? '1 Year' : `${years} Years`;
};