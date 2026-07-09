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
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

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
    NavigationControls.closeSheet();
  }, [handleCloseFlow]);

  const handleBuy = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.Buy);
  }, []);

  useEffect(() => {
    if (state === 'failure') {
      props.navigation.setOptions({
        header: (
          <Sheet.Header
            title={t('collateral.sheet.failure.title')}
            testID="collateral-failure-status-header"
          />
        ),
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: t('collateral.sheet.failure.button.close'),
              onPress: handleClose,
              testID: 'collateral-failure-status-button',
            }}
          />
        ),
      });
      return;
    }

    if (state === 'not-enough-balance') {
      props.navigation.setOptions({
        header: (
          <Sheet.Header
            title={t('collateral.sheet.header')}
            subtitle={t('collateral.sheet.not-set.description', {
              amount: collateralAmount,
            })}
            testID="collateral-not-enough-balance-status-header"
          />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('collateral.sheet.not-enough-balance.button.cancel'),
              onPress: handleClose,
              testID: 'collateral-not-enough-balance-status-secondary-button',
            }}
            primaryButton={{
              label: t('collateral.sheet.not-enough-balance.button.buy'),
              onPress: handleBuy,
              testID: 'collateral-not-enough-balance-status-button',
            }}
          />
        ),
      });
      return;
    }

    if (state === 'not-set') {
      props.navigation.setOptions({
        header: <Sheet.Header title={t('collateral.sheet.header')} />,
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: collateralAmount
                ? t('collateral.sheet.not-set.button.confirm')
                : t('collateral.sheet.not-set.button.confirm.no-amount'),
              onPress: handleSetCollateral,
              loading: isProcessing,
            }}
          />
        ),
      });
      return;
    }

    if (state === 'set') {
      props.navigation.setOptions({
        header: <Sheet.Header title={t('collateral.sheet.header')} />,
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: collateralAmount
                ? t('collateral.sheet.set.button.confirm')
                : t('collateral.sheet.set.button.confirm.no-amount'),
              onPress: handleReclaimCollateral,
              loading: isProcessing,
            }}
          />
        ),
      });
    }
  }, [
    props.navigation,
    state,
    t,
    collateralAmount,
    handleClose,
    handleBuy,
    handleSetCollateral,
    handleReclaimCollateral,
    isProcessing,
  ]);

  if (state === 'initializing') {
    return (
      <Column
        justifyContent="center"
        alignItems="center"
        style={styles.loadingContainer}>
        <Loader />
      </Column>
    );
  }

  // Failure state
  if (state === 'failure') {
    return (
      <StatusSheet
        body={t('collateral.sheet.failure.subtitle')}
        icon={{
          name: 'Sad',
          variant: 'solid',
        }}
        testID="collateral-failure-status"
      />
    );
  }

  // Not enough balance state
  if (state === 'not-enough-balance') {
    return (
      <StatusSheet
        body={t('collateral.sheet.not-enough-balance.subtitle')}
        icon={{
          name: 'Sad',
        }}
        testID="collateral-not-enough-balance-status"
      />
    );
  }

  // Not set state (add collateral)
  if (state === 'not-set') {
    return (
      <CollateralTemplate
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
        testID="collateral-not-set-sheet"
      />
    );
  }

  // Set state (reclaim collateral)
  if (state === 'set') {
    return (
      <CollateralTemplate
        description={t('collateral.sheet.set.description', {
          amount: collateralAmount,
        })}
        icon={{
          name: 'MoneyReceive01',
          variant: 'stroke',
        }}
        body={t('collateral.sheet.set.warning-card')}
        testID="collateral-set-sheet"
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
  },
});
