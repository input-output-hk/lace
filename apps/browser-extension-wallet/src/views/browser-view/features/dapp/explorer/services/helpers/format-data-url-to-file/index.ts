export const formatDataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const type = dataUrl.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0];
  try {
    const res: Response = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], fileName, { type });
  } catch (error) {
    // eslint-disable-next-line no-console
    throw console.error(error);
  }
};
