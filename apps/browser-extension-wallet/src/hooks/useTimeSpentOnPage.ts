import { useCallback, useState } from 'react';
import dayjs from 'dayjs';

export interface UseTimeSpentOnPage {
  calculateTimeSpentOnPage: () => number;
  updateEnteredAtTime: (date?: dayjs.ConfigType) => void;
}

export const useTimeSpentOnPage = (initialDate?: dayjs.ConfigType): UseTimeSpentOnPage => {
  const [enteredAtTime, setEnteredAtTime] = useState(dayjs(initialDate));

  return {
    calculateTimeSpentOnPage: useCallback(() => dayjs().diff(enteredAtTime, 'seconds'), [enteredAtTime]),
    updateEnteredAtTime: useCallback((date?: dayjs.ConfigType) => setEnteredAtTime(dayjs(date)), [setEnteredAtTime])
  };
};
