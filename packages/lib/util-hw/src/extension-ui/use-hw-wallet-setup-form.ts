import { useTranslation } from '@lace-contract/i18n';
import { useCallback, useMemo, useState } from 'react';

import { type DerivationType } from '../types';

import type { HardwareErrorCategory } from '../classify-hardware-error';

export interface UseHwWalletSetupFormProps {
  derivationTypes?: DerivationType[];
  errorCategory: HardwareErrorCategory | null | undefined;
}

export interface DerivationTypeOption {
  value: DerivationType;
  label: string;
  description: string;
}

export interface UseHwWalletSetupFormResult {
  accountIndex: number;
  setAccountIndex: (index: number) => void;
  derivationType: DerivationType | undefined;
  handleDerivationTypeChange: (value: string) => void;
  derivationTypeOptions: DerivationTypeOption[] | undefined;
  error: string | null;
}

export const useHwWalletSetupForm = ({
  derivationTypes,
  errorCategory,
}: UseHwWalletSetupFormProps): UseHwWalletSetupFormResult => {
  const { t } = useTranslation();

  const [accountIndex, setAccountIndex] = useState(0);
  const [derivationType, setDerivationType] = useState<
    DerivationType | undefined
  >(derivationTypes?.[0]);

  const handleDerivationTypeChange = useCallback((value: string) => {
    setDerivationType(value as DerivationType);
  }, []);

  const derivationTypeOptions = useMemo(
    () =>
      derivationTypes?.map(dt => ({
        value: dt,
        label: t(`onboarding.hardware-wallet-setup.derivation.${dt}.label`),
        description: t(
          `onboarding.hardware-wallet-setup.derivation.${dt}.description`,
        ),
      })),
    [derivationTypes, t],
  );

  const error = errorCategory ? t(`hw-error.${errorCategory}.subtitle`) : null;

  return {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeOptions,
    error,
  };
};
