import { complexityLevels } from '@lace/common';
import { validationErrorKeys } from './types';

export const minimumPassLevelRequired = 3;
export const passwordLevelFeedback = 2;

export const nameShouldHaveRightLengthRegex = /^.{1,20}$/;

export const validateNameLength = (name: string): validationErrorKeys | '' =>
  !nameShouldHaveRightLengthRegex.test(name) ? 'nameMaxLength' : '';

export const WALLET_NAME_INPUT_MAX_LENGTH = 30;

export const getComplexityBarStateList = (
  score: number
): {
  isActive: boolean;
  'data-testid': string;
}[] => [
  {
    isActive: true,
    'data-testid': 'complexity-bar-1'
  },
  {
    isActive: score > complexityLevels.low,
    'data-testid': 'complexity-bar-2'
  },
  {
    isActive: score > complexityLevels.mid,
    'data-testid': 'complexity-bar-3'
  },
  {
    isActive: score === complexityLevels.veryHigh,
    'data-testid': 'complexity-bar-4'
  }
];
