export const isExplicitHttpUrl = (input: string): boolean =>
  /^http:\/\//i.test(input.trim());

export const tryParseExternalUrl = (input: string): string | undefined => {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return undefined;
  if (isExplicitHttpUrl(trimmed)) return undefined;

  const candidate = /^https:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return undefined;
    if (!url.hostname.includes('.')) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

export const normalizeUrlForId = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const normalized = parsed.toString();
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  } catch {
    return url;
  }
};

export const deriveDappNameFromUrl = (url: string): string => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
};

export const getFaviconUrl = (url: string): string | undefined => {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return undefined;
  }
};
