import {
  getLocaleSeparators,
  parseLocaleNumber,
  valueToLocale,
} from '@lace-lib/util-render';

type AssetInputValue = { tokenId: string; value: string };

export const formatAssetInputValues = (
  previous: AssetInputValue[],
  tokenId: string,
): AssetInputValue[] => {
  const targetIndex = previous.findIndex(item => item.tokenId === tokenId);
  if (targetIndex === -1) return previous;
  const targetValue = previous[targetIndex].value;
  if (targetValue.trim() === '') return previous;

  const { decimalSeparator } = getLocaleSeparators();
  const parts = targetValue.split(decimalSeparator);
  // A trailing separator is an unfinished fractional amount, not a format error.
  if (parts.length === 2 && targetValue.endsWith(decimalSeparator)) {
    return previous;
  }

  const formatted =
    parts.length > 2
      ? parts[0] + decimalSeparator + parts.slice(1).join('')
      : valueToLocale(
          parseLocaleNumber(targetValue),
          (parts[1] ?? '').replace(/\D/g, '').length,
          20,
        );
  if (formatted === targetValue) return previous;

  return previous.map((item, index) =>
    index === targetIndex ? { ...item, value: formatted } : item,
  );
};
