import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { useLaceSelector } from '../../hooks';

import type { StackScreenProps } from '@lace-lib/navigation';

export const useClaimError = ({
  navigation,
}: StackScreenProps<StackRoutes.ClaimError>) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const error = useLaceSelector('cardanoUriLinking.selectError');

  const iconSize = useMemo(() => width / 2, [width]);

  const errorMessage = useMemo(() => {
    if (!error) return '';
    return t(`v2.cardano-uri-linking.claim-error.${error.status}`);
  }, [error, t]);

  const handleDismiss = useCallback(() => {
    navigation.navigate(StackRoutes.Home, {
      screen: TabRoutes.Portfolio,
    });
  }, [navigation]);

  const title = t('v2.cardano-uri-linking.claim-error.title');
  const errorLabel = t('v2.generic.error');
  const dismissLabel = t('v2.generic.dismiss');

  return {
    error,
    errorMessage,
    errorCode: error?.code,
    iconSize,
    title,
    errorLabel,
    dismissLabel,
    onDismiss: handleDismiss,
  };
};
