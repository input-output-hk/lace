/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockdayjsinner = jest.fn();
const fn = (date: any) => mockdayjsinner(date);
fn.extend = jest.fn();
/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { DEFAULT_DATE_FORMAT, formatDate, formatTime, DEFAULT_TIME_FORTMAT } from '../format-date';

jest.mock('dayjs', () => {
  const original = jest.requireActual('dayjs');
  return {
    __esModule: true,
    ...original.default,
    ...original,
    default: fn
  };
});

describe('Testing format-date functions', () => {
  test('should return formatted date (UTC)', async () => {
    const result = 'result';

    const utcMock = jest.fn();
    const formatMock = jest.fn();
    mockdayjsinner.mockReturnValue({ utc: utcMock });
    utcMock.mockReturnValue({ format: formatMock });
    formatMock.mockReturnValue(result);
    const date = new Date();

    expect(formatDate({ date, type: 'utc' })).toEqual(result);
    expect(mockdayjsinner).toBeCalledWith(date);
    expect(utcMock).toBeCalledWith(false);
    expect(formatMock).toBeCalledWith(DEFAULT_DATE_FORMAT);

    const format = 'format';
    expect(formatDate({ date, format, type: 'utc' })).toEqual(result);
    expect(utcMock).toBeCalledWith(false);
    expect(formatMock).toBeCalledWith(format);

    mockdayjsinner.mockReset();
    utcMock.mockReset();
    formatMock.mockReset();
  });
  test('should return formatted date (local)', async () => {
    const result = 'result';

    const utcMock = jest.fn();
    const formatMock = jest.fn();
    mockdayjsinner.mockReturnValue({ utc: utcMock });
    utcMock.mockReturnValue({ format: formatMock });
    formatMock.mockReturnValue(result);
    const date = new Date();

    expect(formatDate({ date, type: 'local' })).toEqual(result);
    expect(mockdayjsinner).toBeCalledWith(date);
    expect(utcMock).toBeCalledWith(true);
    expect(formatMock).toBeCalledWith(DEFAULT_DATE_FORMAT);

    const format = 'format';
    expect(formatDate({ date, format, type: 'local' })).toEqual(result);
    expect(utcMock).toBeCalledWith(true);
    expect(formatMock).toBeCalledWith(format);

    mockdayjsinner.mockReset();
    utcMock.mockReset();
    formatMock.mockReset();
  });
  test('should return formatted time (UTC)', async () => {
    const result = 'result';

    const utcMock = jest.fn();
    const formatMock = jest.fn();
    mockdayjsinner.mockReturnValue({ utc: utcMock });
    utcMock.mockReturnValue({ format: formatMock });
    formatMock.mockReturnValue(result);
    const date = new Date();

    expect(formatTime({ date, type: 'utc' })).toEqual(result);
    expect(mockdayjsinner).toBeCalledWith(date);
    expect(formatMock).toBeCalledWith(DEFAULT_TIME_FORTMAT);

    const format = 'format';
    expect(formatDate({ date, format, type: 'utc' })).toEqual(result);
    expect(formatMock).toBeCalledWith(format);

    mockdayjsinner.mockReset();
    utcMock.mockReset();
    formatMock.mockReset();
  });
});
