const connectionErrorCodes = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

const connectionErrorNames = new Set(['WebSocketClosed', 'ServerNotReady']);

export const isConnectionError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;
  if (
    (error?.name && connectionErrorNames.has(error.name)) ||
    (error?.code && connectionErrorCodes.has(error.code))
  ) {
    return true;
  }
  return isConnectionError(error.innerError);
};
