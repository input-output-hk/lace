// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const formatFileToUrl = (file: any, defaultValue?: any): any => {
  if (!file?.name) return defaultValue || '';
  // eslint-disable-next-line promise/avoid-new
  const promise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(reader.result);
    });
    reader.readAsDataURL(file);
  });

  return promise
    .then((img) => img)
    .catch((error) => {
      throw new Error(error);
    });
};
