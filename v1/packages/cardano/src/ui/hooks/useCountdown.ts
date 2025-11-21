import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { formatCountdown } from '../util/format-countdown';
import { getTimeLeft } from '../util/get-time-left';

const defaultRefreshCycle = 1000;

interface UseCountdown {
  countdown: string;
  hasCountdownFinished: boolean;
}

export const useCountdown = (endTime: string | number | Date, refreshCycle = defaultRefreshCycle): UseCountdown => {
  const timeLeft = getTimeLeft(endTime);
  const [countdown, setCountdown] = useState(timeLeft);
  const [hasCountdownFinished, setHasCountdownFinished] = useState(timeLeft <= 0);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft(endTime);
      setCountdown(left);
    }, refreshCycle);

    if (hasCountdownFinished) return () => clearInterval(timer);

    if (countdown <= 0 || dayjs(endTime).isBefore(dayjs())) {
      setHasCountdownFinished(true);
      setCountdown(0);
      return () => clearInterval(timer);
    }

    return () => {
      clearInterval(timer);
    };
  }, [endTime, hasCountdownFinished, refreshCycle, countdown]);

  return { countdown: formatCountdown(timeLeft), hasCountdownFinished };
};
