import { useTranslation } from '@lace-contract/i18n';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  type SheetScreenProps,
} from '@lace-lib/navigation';
import { SheetRoutes } from '@lace-lib/navigation';
import {
  CollateralTemplate,
  StatusSheet,
  Loader,
  Column,
} from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCollateralState } from '../hooks/useCollateralState';

export const CollateralSheet = (
  props: SheetScreenProps<SheetRoutes.Collateral>,
) => {
  const { t } = useTranslation();
  const { accountId, walletId } = props.route.params;

  const {
    state,
    collateralAmount,
    estimatedFee,
    currency,
    handleSetCollateral,
    handleClose: handleCloseFlow,
    handleReclaimCollateral,
    isProcessing,
  } = useCollateralState({
    accountId: AccountId(accountId),
    walletId: WalletId(walletId),
  });

  const handleClose = useCallback(() => {
    // Close the state machine and discard transaction if needed
    handleCloseFlow();
    // Close the sheet
    NavigationControls.sheets.close();
  }, [handleCloseFlow]);

  const handleBuy = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.Buy);
  }, []);

  if (state === 'initializing') {
    return (
      <View style={styles.loadingContainer}>
        <Column justifyContent="center" alignItems="center" gap={16}>
          <Loader size={48} />
        </Column>
      </View>
    );
  }

  // Failure state
  if (state === 'failure') {
    return (
      <StatusSheet
        title={t('collateral.sheet.failure.title')}
        body={t('collateral.sheet.failure.subtitle')}
        icon={{
          name: 'Sad',
          variant: 'solid',
          size: 64,
        }}
        buttonText={t('collateral.sheet.failure.button.close')}
        buttonAction={handleClose}
        testID="collateral-failure-status"
      />
    );
  }

  // Not enough balance state
  if (state === 'not-enough-balance') {
    return (
      <StatusSheet
        title={t('collateral.sheet.header')}
        description={t('collateral.sheet.not-set.description', {
          amount: collateralAmount,
        })}
        body={t('collateral.sheet.not-enough-balance.subtitle')}
        icon={{
          name: 'Sad',
          variant: 'stroke',
          size: 64,
        }}
        secondaryButtonText={t(
          'collateral.sheet.not-enough-balance.button.cancel',
        )}
        secondaryButtonAction={handleClose}
        buttonText={t('collateral.sheet.not-enough-balance.button.buy')}
        buttonAction={handleBuy}
        testID="collateral-not-enough-balance-status"
      />
    );
  }

  // Not set state (add collateral)
  if (state === 'not-set') {
    return (
      <CollateralTemplate
        headerTitle={t('collateral.sheet.header')}
        description={t('collateral.sheet.not-set.description', {
          amount: collateralAmount,
        })}
        infoCards={[
          {
            variant: 'success',
            text: t('collateral.sheet.not-set.success-card'),
            iconName: 'Checkmark',
          },
        ]}
        estimatedFee={
          estimatedFee
            ? {
                label: t('collateral.sheet.not-set.estimated-fee'),
                amount: t('collateral.sheet.not-set.estimated-fee.amount', {
                  amount: estimatedFee.ada,
                }),
                fiat: estimatedFee.fiatFormatted
                  ? t('collateral.sheet.not-set.estimated-fee.fiat', {
                      amount: estimatedFee.fiatFormatted,
                      currency: currency?.ticker,
                    })
                  : undefined,
              }
            : undefined
        }
        footer={{
          primaryButton: {
            label: collateralAmount
              ? t('collateral.sheet.not-set.button.confirm')
              : t('collateral.sheet.not-set.button.confirm.no-amount'),
            onPress: handleSetCollateral,
            loading: isProcessing,
          },
        }}
        testID="collateral-not-set-sheet"
      />
    );
  }

  // Set state (reclaim collateral)
  if (state === 'set') {
    return (
      <CollateralTemplate
        headerTitle={t('collateral.sheet.header')}
        description={t('collateral.sheet.set.description', {
          amount: collateralAmount,
        })}
        icon={{
          name: 'MoneyReceive01',
          variant: 'stroke',
          size: 64,
        }}
        body={t('collateral.sheet.set.warning-card')}
        footer={{
          primaryButton: {
            label: collateralAmount
              ? t('collateral.sheet.set.button.confirm')
              : t('collateral.sheet.set.button.confirm.no-amount'),
            onPress: handleReclaimCollateral,
            loading: isProcessing,
          },
        }}
        testID="collateral-set-sheet"
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
