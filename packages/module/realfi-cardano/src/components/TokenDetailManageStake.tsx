import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { Button, Column, spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { useActiveRealFiConfig } from '../use-realfi-config';

/**
 * "Manage Stake" entry point on the USDr Token Detail sheet (LW-14650 AC 1):
 * rendered above the token's activity list via the token-details UI
 * customisation. The customisation selector matches USDr on any configured
 * network; this component additionally guards on the LIVE active-network
 * config, so the button never shows when RealFi is not enabled for the
 * network the token belongs to.
 */
export const TokenDetailManageStake = ({
  tokenId,
}: {
  tokenId: string;
}): React.JSX.Element | null => {
  const { t } = useTranslation();
  const config = useActiveRealFiConfig();

  const onManageStake = useCallback(() => {
    // The token detail is a bottom sheet and the staking detail a stack page:
    // close the sheet first so the pushed page is what the user lands on. The
    // destination resolves the empty accountId to the first active-network
    // account (same placeholder contract as the Staking Center card).
    NavigationControls.closeSheet();
    NavigationControls.navigate(StackRoutes.UsdrStakingDetail, {
      accountId: '',
    });
  }, []);

  if (tokenId !== config?.usdrTokenId) return null;

  return (
    <Column style={styles.container}>
      <Button.Primary
        label={t('realfi.detail.manage-stake')}
        onPress={onManageStake}
        testID="realfi-token-detail-manage-stake"
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.M,
  },
});
