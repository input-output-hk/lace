export const formatMetadataValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return formatMetadataArray(value);
  }
  if (typeof value === 'object') {
    return formatMetadataObject(value as Record<string, unknown>);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unable to serialize]';
  }
};

const formatMetadataObject = (value: Record<string, unknown>): string =>
  Object.entries(value)
    .map(([key, nestedValue]) => `${key}: ${formatMetadataValue(nestedValue)}`)
    .join(', ');

const formatMetadataArray = (value: unknown[]): string => {
  const separator = value.some(
    item => Array.isArray(item) || (item !== null && typeof item === 'object'),
  )
    ? '; '
    : ', ';

  return value.map(item => formatMetadataValue(item)).join(separator);
};
