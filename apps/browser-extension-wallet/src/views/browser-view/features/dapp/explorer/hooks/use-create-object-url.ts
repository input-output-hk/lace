import { useEffect, useState } from 'react';

export const useCreateObjectUrl = (selectedFile: any) => {
  const [preview, setPreview] = useState<any>();

  useEffect(() => {
    if (!selectedFile) {
      setPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // eslint-disable-next-line consistent-return
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  return preview;
};
