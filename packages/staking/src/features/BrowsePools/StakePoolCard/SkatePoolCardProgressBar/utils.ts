/* eslint-disable no-magic-numbers */
export const getProgressColor = (percentage: number): string => {
  if (percentage <= 20) {
    return '#3489F7'; // blue
  } else if (percentage <= 69) {
    return '#2CB67D'; // green
  } else if (percentage <= 90) {
    return '#FDC300'; // yellow
  } else if (percentage < 100) {
    return '#FF8E3C'; // orange
  }
  return '#FF5470';
};
