import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORTMAT = 'HH:mm:ss';

export const formatDate = (date: Date | string | number, format?: string): string =>
  dayjs(date)
    .utc()
    .format(format ?? DEFAULT_DATE_FORMAT);

export const formatTime = (date: Date | string | number, format?: string): string =>
  dayjs(date)
    .utc()
    .format(format ?? DEFAULT_TIME_FORTMAT);
