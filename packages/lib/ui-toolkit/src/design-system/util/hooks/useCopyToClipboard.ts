import { useCallback } from 'react';

import { Clipboard } from '../../util';

interface UseCopyToClipboardOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  onPasteSuccess?: (content: string) => void;
}

export const useCopyToClipboard = (options?: UseCopyToClipboardOptions) => {
  const copyToClipboard = useCallback(
    (text: string) => {
      const copyToClipboard = async () => {
        try {
          await Clipboard.setStringAsync(text);
          options?.onSuccess?.();
        } catch (error) {
          options?.onError?.(error);
        }
      };

      void copyToClipboard();
    },
    [options],
  );

  const getClipboardContent = useCallback(async () => {
    try {
      const content = await Clipboard.getStringAsync();
      return content;
    } catch (error) {
      options?.onError?.(error);
      return null;
    }
  }, [options]);

  const pasteFromClipboard = useCallback(() => {
    const paste = async () => {
      try {
        const content = await Clipboard.getStringAsync();
        if (content) {
          options?.onPasteSuccess?.(content);
        }
      } catch (error) {
        options?.onError?.(error);
      }
    };

    void paste();
  }, [options]);

  return {
    copyToClipboard,
    getClipboardContent,
    pasteFromClipboard,
  };
};
