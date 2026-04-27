type MetadataMessage = { msg: string };

export const displayMetadataValue = (value: unknown[] | string): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (!Array.isArray(value)) {
    return '';
  }

  // Look for message objects first
  for (const item of value) {
    if (
      item &&
      typeof item === 'object' &&
      'msg' in item &&
      typeof (item as MetadataMessage).msg === 'string'
    ) {
      return (item as MetadataMessage).msg;
    }
  }

  // If no message found, try to extract meaningful information from other structures
  const extractInfo = (object: unknown, depth = 0): string => {
    if (depth > 5) return '...'; // Prevent infinite recursion
    if (typeof object === 'string' || typeof object === 'number') {
      return String(object);
    }

    if (Array.isArray(object)) {
      return object.map(item => extractInfo(item, depth + 1)).join(', ');
    }

    if (object && typeof object === 'object') {
      const entries = Object.entries(object as Record<string, unknown>).slice(
        0,
        3,
      ); // Limit to first 3 properties
      return entries
        .map(([key, value]) => `${key}: ${extractInfo(value, depth + 1)}`)
        .join(', ');
    }

    return '';
  };

  const extracted = value.map(item => extractInfo(item)).filter(Boolean);
  return extracted.length > 0 ? extracted.join(' | ') : JSON.stringify(value);
};
