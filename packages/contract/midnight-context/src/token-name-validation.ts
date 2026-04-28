import { TOKEN_FULL_NAME_MAX_LENGTH } from '@lace-contract/tokens';
import inRange from 'lodash/inRange';
import toLower from 'lodash/toLower';

export const TOKEN_FULL_NAME_MIN_LENGTH = 1;
export const TOKEN_SHORT_NAME_MIN_LENGTH = 1;
export const TOKEN_SHORT_NAME_MAX_LENGTH = 4;

export const TOKEN_FORBIDDEN_NAMES = [
  'dust',
  'lace',
  'midnight',
  'tdust',
  'night',
  'tnight',
];

export const isForbiddenTokenName = (
  name: string,
  extraExcludedTokenNames: string[] = [],
): boolean =>
  [...TOKEN_FORBIDDEN_NAMES, ...extraExcludedTokenNames.map(toLower)].includes(
    toLower(name),
  );

export const isTakenTokenName = (
  name: string,
  takenTokenNames: string[] = [],
): boolean => takenTokenNames.map(toLower).includes(toLower(name));

const createTokenNameValidator =
  (minLength: number, maxLength: number) =>
  (name: string, excludedNames: string[] = []): boolean => {
    const isInvalidNameLength = !inRange(
      name.trim().length,
      minLength,
      maxLength + 1,
    );
    return !(isForbiddenTokenName(name, excludedNames) || isInvalidNameLength);
  };

export const isTokenFullNameValid = createTokenNameValidator(
  TOKEN_FULL_NAME_MIN_LENGTH,
  TOKEN_FULL_NAME_MAX_LENGTH,
);

export const isTokenShortNameValid = createTokenNameValidator(
  TOKEN_SHORT_NAME_MIN_LENGTH,
  TOKEN_SHORT_NAME_MAX_LENGTH,
);
