import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { StackScreenProps } from '@lace-lib/navigation';
import type { ClaimPayloadDropdownItem } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

export const useClaimPayload = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.ClaimPayload>) => {
  const { t } = useTranslation();
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const addresses = useLaceSelector('addresses.selectAllAddresses');
  const claimingAccount = useLaceSelector(
    'cardanoUriLinking.selectClaimingAccount',
  );
  const isLoading = useLaceSelector('cardanoUriLinking.selectIsSubmitting');
  const setClaimingAccount = useDispatchLaceAction(
    'cardanoUriLinking.setClaimingAccount',
  );
  const submitClaim = useDispatchLaceAction('cardanoUriLinking.submitClaim');
  const showToast = useDispatchLaceAction('ui.showToast');

  const { faucet_url, code, user_id } = route.params ?? {};

  const handleNavigateToHome = useCallback(() => {
    navigation.navigate(StackRoutes.Home, { screen: TabRoutes.Portfolio });
  }, [navigation]);

  const getAccountName = useCallback(
    (account: AnyAccount): string => {
      const address = addresses.find(
        addr => addr.accountId === account.accountId,
      );

      return (
        account.metadata.name +
        ' - ' +
        address?.address.substring(0, 8) +
        '...' +
        address?.address.substring(
          address?.address.length - 8,
          address?.address.length,
        )
      );
    },
    [addresses],
  );

  const filteredAccounts = useMemo(() => {
    // CIP-0099 only supports Cardano accounts
    return accounts.filter(
      account => account?.blockchainName === ('Cardano' as BlockchainName),
    );
  }, [accounts]);

  useEffect(() => {
    if (!claimingAccount) {
      setClaimingAccount(filteredAccounts[0] ?? null);
    }
  }, [accounts, claimingAccount, filteredAccounts, setClaimingAccount]);

  useEffect(() => {
    if (filteredAccounts.length !== 0) return;
    const hasAnyWallet = accounts.length > 0;

    showToast({
      text: t('v2.cardano-uri-linking.claim-error.no-cardano-account'),
      color: 'negative',
      duration: 3,
      leftIcon: { name: 'AlertTriangle', size: 20 },
    });
    if (hasAnyWallet) {
      navigation.navigate(StackRoutes.AddWallet);
    } else {
      navigation.navigate(StackRoutes.OnboardingStart);
    }
  }, [filteredAccounts, accounts, showToast, t, navigation]);

  const dropdownItems = useMemo<ClaimPayloadDropdownItem[]>(
    () =>
      filteredAccounts.map(account => {
        const name = getAccountName(account);
        return {
          id: account.accountId,
          text: name,
        };
      }),
    [filteredAccounts, getAccountName],
  );

  const domain = useMemo(() => {
    if (!faucet_url || !code) {
      return null;
    }
    try {
      return new URL(faucet_url).hostname;
    } catch {
      return null;
    }
  }, [faucet_url, code]);

  const handleSelectAccount = useCallback(
    (index: number) => {
      setClaimingAccount(filteredAccounts[index]);
    },
    [filteredAccounts, setClaimingAccount],
  );

  const handleSubmitClaim = useCallback(() => {
    if (isLoading) return;
    submitClaim({ faucet_url, code, user_id });
  }, [isLoading, submitClaim, faucet_url, code, user_id]);

  const description = t('v2.cardano-uri-linking.claim-payload.description');
  const cancelLabel = t('v2.generic.cancel');
  const ctaLabel = t('v2.cardano-uri-linking.claim-payload.cta');

  return {
    isLoading,
    domain,
    description,
    cancelLabel,
    ctaLabel,
    dropdownItems,
    selectedAccountId: claimingAccount?.accountId,
    selectedAccountName: claimingAccount?.metadata?.name,
    onSelectAccount: handleSelectAccount,
    onCancel: handleNavigateToHome,
    onSubmit: handleSubmitClaim,
  };
};
