// Mirrors the swap center's rules (SwapResult.tsx): a failure detail arrives
// as a short human-readable provider/SDK message ("RealFi vault rate
// unavailable — cannot quote"), an i18n-key-like token, or a raw node/client
// dump that can run to kilobytes. Only the first belongs on screen — key-like
// text is meaningless to users and dumps already reached the debug logs at the
// point of failure.
const MAX_HUMAN_ERROR_LENGTH = 140;
const isTranslationKeyLike = (value: string): boolean =>
  /^[\w-]+(\.[\w-]+)+$/.test(value);
const isHumanReadable = (value: string): boolean =>
  value.length <= MAX_HUMAN_ERROR_LENGTH && !/[{}[\]\\"]/.test(value);

/** The failure detail when it is short human-readable text, else undefined. */
export const sanitizeErrorDetail = (
  detail: string | undefined,
): string | undefined =>
  detail !== undefined &&
  isHumanReadable(detail) &&
  !isTranslationKeyLike(detail)
    ? detail
    : undefined;
