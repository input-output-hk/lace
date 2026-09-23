import { FEATURE_FLAG_CNIGHT_DESIGNATION } from '@lace-contract/cardano-context';
import {
  CardanoDustNetwork,
  getCnightAssetId,
} from '@lace-lib/cnight-dust-designation';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { ActionButton, Icon, IconButton } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useLaceSelector } from '../hooks';

import type { AccountCardActionVariant } from '@lace-contract/app';
import type { AccountId } from '@lace-contract/wallet-repo';

interface CnightDesignationAccountActionProps {
  accountId: AccountId;
  variant: AccountCardActionVariant;
}

/**
 * Account-card action-row entry (icon-only) to the cNIGHT → DUST designation
 * flow. Rendered only when the Cardano account actually holds cNIGHT — the token
 * is not surfaced in the token list (its policy id lives only in
 * `@lace-lib/cnight-dust-designation`), so holdings are detected by scanning the
 * account's UTxOs for the cNIGHT asset id. Gated by `FEATURE_FLAG_CNIGHT_DESIGNATION`.
 * Renders with the row's button style (`variant`) so it matches the siblings.
 */
export const CnightDesignationAccountAction = ({
  accountId,
  variant,
}: CnightDesignationAccountActionProps) => {
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const utxosByAccount = useLaceSelector('cardanoContext.selectAccountUtxos');

  const isEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CNIGHT_DESIGNATION),
    [featureFlags],
  );

  const hasCnight = useMemo(() => {
    if (!chainId) return false;
    const cnightAssetId = getCnightAssetId(
      CardanoDustNetwork.fromNetworkMagic(chainId.networkMagic),
    );
    const utxos = utxosByAccount[accountId] ?? [];
    return utxos.some(
      ([, out]) => (out.value.assets?.get(cnightAssetId) ?? 0n) > 0n,
    );
  }, [chainId, utxosByAccount, accountId]);

  const handlePress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.CnightDesignation, { accountId });
  }, [accountId]);

  if (!isEnabled || !hasCnight) return null;

  // Match the sibling actions in whichever button style the row uses.
  return variant === 'action' ? (
    <ActionButton
      icon="Dust"
      showTitle={false}
      onPress={handlePress}
      containerStyle={styles.transparentAction}
      iconStyle={ICON_STYLE}
      testID="account-card-generate-dust-button"
    />
  ) : (
    <IconButton.Static
      icon={<Icon name="Dust" size={14} />}
      onPress={handlePress}
      testID="account-card-generate-dust-button"
    />
  );
};

const ICON_STYLE = { size: 20 } as const;

const styles = StyleSheet.create({
  transparentAction: {
    backgroundColor: 'transparent',
  },
});
