import { useTranslation } from '@lace-contract/i18n';
import { useMemo } from 'react';
import zxcvbn from 'zxcvbn';

export const MIN_PASSWORD_STRENGTH_SCORE = 3;

export const usePasswordStrength = (password: string) => {
  const { t } = useTranslation();

  const strengthResult = useMemo(() => {
    return zxcvbn(password);
  }, [password]);

  const feedback = useMemo(() => {
    if (password.length === 0) return '';
    switch (strengthResult.score) {
      case 0:
      case 1:
        return t('onboarding.in-memory.password.validation.weak');
      case 2:
        return t('onboarding.in-memory.password.validation.medium');
      case 3:
      case 4:
      default:
        return '';
    }
  }, [password.length, strengthResult.score, t]);

  return useMemo(
    () => ({
      score: strengthResult.score,
      feedback,
      isStrong: strengthResult.score >= MIN_PASSWORD_STRENGTH_SCORE,
    }),
    [strengthResult.score, feedback],
  );
};
