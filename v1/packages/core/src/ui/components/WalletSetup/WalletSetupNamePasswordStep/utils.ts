import { complexityLevels } from '@ui/components/PasswordVerification';
import { ValidationErrorKeys } from './types';
import { CoreTranslationKey } from '@lace/translation';

// Depending on what is the result of the A/B test, we might want to use these functions/constants in WalletSetupRegisterStep.tsx and WalletSetupPasswordStep.tsx to clean thing up
export const MINIMUM_PASSWORD_LEVEL_REQUIRED = 3;
export const WALLET_NAME_INPUT_MAX_LENGTH = 30;

export const passwordStrengthFeedbackMap: Record<number, CoreTranslationKey> = {
  0: 'core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback',
  1: 'core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback',
  2: 'core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'
};

export const nameShouldHaveRightLengthRegex = /^.{1,20}$/;
export const validateNameLength = (name: string): ValidationErrorKeys | '' =>
  !nameShouldHaveRightLengthRegex.test(name) ? 'nameMaxLength' : '';

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
