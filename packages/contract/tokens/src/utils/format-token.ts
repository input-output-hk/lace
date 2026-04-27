import { TOKEN_FULL_NAME_MAX_LENGTH } from '../constants';

export const formatTokenFullName = (
  tokenName: string,
  maxLength = TOKEN_FULL_NAME_MAX_LENGTH,
) => {
  if (tokenName.length <= maxLength) return tokenName;

  const nameLastPart = `...${tokenName.slice(-2)}`;
  const nameFirstPart = tokenName.slice(
    0,
    Math.max(0, maxLength - nameLastPart.length),
  );

  return `${nameFirstPart}${nameLastPart}`;
};

export const getTokenTickerFallback = (tokenIdOrName: string) =>
  `${tokenIdOrName.slice(0, 2)}...${tokenIdOrName.slice(-2)}`;
