/* eslint-disable promise/avoid-new */

export interface IImageSizeOptions {
  maxSize: number;
  message?: string;
}

export interface IImageSizeResponse {
  error?: boolean;
  message?: string;
  success?: boolean;
}

const DEFAULT_MESSAGE = 'Woops! Your image is too big. Please submit again, the maximum file size is 2048Kb.';

const DEFAULT_FILE_DECIMAL_POINT = 4;

const successResponse = {
  success: true
};

const formatFileSize = (
  bytes: number,
  decimalPoint = DEFAULT_FILE_DECIMAL_POINT
): { formatted: string; value: number } => {
  if (bytes === 0) return { formatted: '0 Bytes', value: 0 };
  const k = 1000;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = Number.parseFloat((bytes / Math.pow(k, i)).toFixed(decimalPoint));
  return { formatted: `${value} ${sizes[i]}`, value };
};

export const validateImagesSize = (
  file: File,
  { maxSize, message = DEFAULT_MESSAGE }: IImageSizeOptions
): IImageSizeResponse => {
  const { formatted, value } = file && formatFileSize(file.size);
  if (formatted.includes('KB' || 'Bytes')) return successResponse;

  if (formatted.includes('MB') && value < maxSize) successResponse;

  return {
    error: true,
    message: `${message} (file size: ${formatted})`
  };
};
