/* eslint-disable promise/avoid-new */

export interface IImageOptions {
  maxSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  message?: string;
}
export interface IImageDimensionsResponse {
  error?: boolean;
  message?: string;
  success?: boolean;
}

const DEFAULT_MESSAGE =
  'Woops! Your image is too large. Please submit again, the dimensions of the file must be 1024x1024 pixels.';

export const validateImagesDimensions = (
  url: string,
  { maxSize, maxWidth, maxHeight, message = DEFAULT_MESSAGE }: IImageOptions
): Promise<IImageDimensionsResponse> => {
  const img = new Image();

  const promise = new Promise<IImageDimensionsResponse>((resolve, reject) => {
    img.addEventListener('load', () => {
      const dHeight = maxSize || maxHeight || 0;
      const dWidth = maxSize || maxWidth || 0;

      // Natural size is the actual image size regardless of rendering.
      // The 'normal' `width`/`height` are for the **rendered** size.
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Resolve promise with the status error and message
      if (height > dHeight || width > dWidth) {
        resolve({
          error: true,
          message: `${message} (image dimension: ${width}x${height})`
        });
      }

      // Resolve promise with the status success
      resolve({ success: true });
    });

    // Reject promise on error
    img.addEventListener('error', reject);
  });

  // Setting the source makes it start downloading and eventually call `onload`
  img.src = url;

  return promise;
};
