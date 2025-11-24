import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORMAT = 'HH:mm:ss';

type FormatDateTimeParams = {
  date: Date | string | number;
  format?: string;
  type: 'utc' | 'local';
};

const formatDateTime = ({ date, format, type }: FormatDateTimeParams): string => {
  const dayJsDate = type === 'utc' ? dayjs(date).utc() : dayjs(date);

  return dayJsDate.format(format ?? DEFAULT_DATE_FORMAT);
};

export const formatDate = ({ date, format, type }: FormatDateTimeParams): string =>
  formatDateTime({ date, format: format ?? DEFAULT_DATE_FORMAT, type });

export const formatTime = ({ date, format, type }: FormatDateTimeParams): string =>
  formatDateTime({ date, format: format ?? DEFAULT_TIME_FORMAT, type });
