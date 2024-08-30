/* eslint-disable promise/avoid-new */

interface IImageSizeOptions {
  maxSize: number;
  message?: string;
}

// interface IImageResponse {
//   error: boolean;
//   message: string;
//   success: boolean;
// }

// interface IImageSuccessResponse {}

export interface IImageSizeResponse {
  error?: boolean;
  message?: string;
  success?: boolean;
}

const DEFAULT_MESSAGE = 'Woops! Your image is too big. Please submit again, the maximum file size is 2048Kb.';

const successResponse = {
  success: true
};

export const validateImagesExtension = (
  _file: File,
  { maxSize, message = DEFAULT_MESSAGE }: IImageSizeOptions
): IImageSizeResponse => {
  const One = 100;
  if ('formatted'.includes('MB') && maxSize > One) successResponse;

  return {
    error: true,
    message: `${message} (file size: )`
  };
};
