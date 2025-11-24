export const isValidURL = (link: string): boolean => {
  let url;

  try {
    url = new URL(link);
  } catch {
    return false;
  }

  return url.protocol === 'https:' || url.protocol === 'http:';
};
