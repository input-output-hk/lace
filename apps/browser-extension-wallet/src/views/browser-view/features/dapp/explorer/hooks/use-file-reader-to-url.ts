/* eslint-disable no-console */
import { useEffect, useState } from 'react';

export const useFileReaderToUrl = (selectedFile?: any) => {
  const [file, setFile] = useState<any>(selectedFile);
  const [fileUrl, setFileUrl] = useState<any>();

  useEffect(() => {
    if (!file) {
      setFileUrl('');
      return;
    }

    if (typeof file === 'string') {
      setFileUrl(file);
      return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (reader.result) setFileUrl(reader.result);
    });

    reader?.readAsDataURL(file);

    // return () => reader.removeEventListener('load', listener);
  }, [file]);

  return [fileUrl, setFile];
};
