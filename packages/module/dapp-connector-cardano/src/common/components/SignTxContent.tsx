import { useConfig } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  CustomTag,
  Divider,
  spacing,
  Text,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useTransactionSummaryData } from '../hooks/useTransactionSummaryData';
import { getTransactionTypeLabel } from '../utils/sign-tx-utils';

import {
  AddressesSection,
  AdditionalInfoSection,
  CollapsibleSection,
  TxDetailsAuxiliaryData,
  TxDetailsProposalProcedures,
  TxDetailsVotingProcedures,
  TxDetailsCertificates,
  InfoRow,
  TransactionSummary,
} from './sign-tx';

import type { TokenTransferValue } from '../hooks/useTransactionSummary';
import type { TokensMetadataMap } from '../utils';
import type { SlotDateTime } from '../utils/slot-datetime';
import type { TransactionInfo } from '../utils/transaction-inspector';
import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export interface SignTxContentDapp {
  name?: string;
  origin: string;
}

export interface SignTxContentProps {
  dapp: SignTxContentDapp;
  txHex: string;
  transactionInfo: TransactionInfo;
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  ownAddresses: string[];
  addressToNameMap: Map<string, string>;
  tokensMetadata: TokensMetadataMap;
  collateralValue: bigint | undefined;
  expiresBy: SlotDateTime | null;
  coinSymbol: string;
  tokenPrices: Record<TokenPriceId, TokenPrice> | undefined;
  currencyTicker: string | undefined;
  networkMagic: Cardano.NetworkMagic | undefined;
  isPartialSign?: boolean;
}

export const SignTxContent = (props: SignTxContentProps) => {
  const {
    dapp,
    txHex,
    transactionInfo,
    fromAddresses,
    toAddresses,
    ownAddresses,
    addressToNameMap,
    tokensMetadata,
    collateralValue,
    expiresBy,
    coinSymbol,
    tokenPrices,
    currencyTicker,
    networkMagic,
    isPartialSign = false,
  } = props;

  const { theme } = useTheme();
  const { t } = useTranslation();
  const { appConfig } = useConfig(); // ConfigProvider wraps both extension and mobile
  const styles = useMemo(() => getStyles(theme), [theme]);

  const explorerBaseUrl =
    networkMagic != null && appConfig?.cexplorerUrls
      ? appConfig.cexplorerUrls[networkMagic] ?? ''
      : '';

  const transactionSummaryData = useTransactionSummaryData({
    fromAddresses,
    toAddresses,
    ownAddresses,
    tokensMetadata,
    coinSymbol,
    tokenPrices,
    currencyTicker,
  });

  const [isCopied, setIsCopied] = useState(false);

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    },
  });

  const handleCopyRawData = useCallback(() => {
    copyToClipboard(txHex);
  }, [copyToClipboard, txHex]);

  const fromAddressEntries = useMemo(
    () =>
      [...fromAddresses.entries()].map(([address, assets]) => ({
        address,
        assets,
        isOwn: ownAddresses.includes(address),
        contactName: addressToNameMap.get(address),
      })),
    [fromAddresses, ownAddresses, addressToNameMap],
  );

  const toAddressEntries = useMemo(
    () =>
      [...toAddresses.entries()].map(([address, assets]) => ({
        address,
        assets,
        isOwn: ownAddresses.includes(address),
        contactName: addressToNameMap.get(address),
      })),
    [toAddresses, ownAddresses, addressToNameMap],
  );

  const utcLabel = String(t('dapp-connector.cardano.sign-tx.utc-label'));
  const expiresBySecondaryValue =
    expiresBy == null ? undefined : `${expiresBy.utcTime} ${utcLabel}`;

  return (
    <Column gap={spacing.L}>
      {isPartialSign && (
        <>
          <Text.XS style={{ fontWeight: 'bold' }}>
            {t('dapp-connector.cardano.sign-tx.partial-sign-notice')}
          </Text.XS>
          <Divider />
        </>
      )}
      <InfoRow
        label={
          <Text.XS>
            {t('dapp-connector.cardano.sign-tx.transaction-label')}
          </Text.XS>
        }
        value={
          <Text.XS>
            {getTransactionTypeLabel(transactionSummaryData.transactionType, t)}
          </Text.XS>
        }
        testID="sign-tx-transaction-type"
      />
      <Divider />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.origin-label')}
        value={<CustomTag color="white" label={dapp.origin} />}
        alignItems="center"
        testID="sign-tx-origin"
      />
      <Divider />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.expires-by-label')}
        value={
          expiresBy
            ? expiresBy.utcDate
            : t('dapp-connector.cardano.sign-tx.no-limit')
        }
        secondaryValue={expiresBySecondaryValue}
        testID="sign-tx-expires-by"
      />
      <Divider />
      <TransactionSummary
        title={t('dapp-connector.cardano.sign-tx.tx-summary-label')}
        defaultOpen={true}
        testID="sign-tx-summary"
        formattedNetCoinBalance={transactionSummaryData.formattedNetCoinBalance}
        formattedFiatNetCoinBalance={
          transactionSummaryData.formattedFiatNetCoinBalance
        }
        assetList={transactionSummaryData.assetList}
        coinSymbol={coinSymbol}
      />
      <Divider />
      <AdditionalInfoSection
        transactionInfo={transactionInfo}
        collateralValue={collateralValue}
        coinSymbol={coinSymbol}
        tokenPrices={tokenPrices}
        currencyTicker={currencyTicker}
      />
      <Divider />

      {fromAddressEntries.length > 0 && (
        <>
          <AddressesSection
            addresses={fromAddressEntries}
            tokensMetadata={tokensMetadata}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            variant="from"
            testID="sign-tx-from"
          />
          <Divider />
        </>
      )}

      {toAddressEntries.length > 0 && (
        <>
          <AddressesSection
            addresses={toAddressEntries}
            tokensMetadata={tokensMetadata}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            variant="to"
            testID="sign-tx-to"
          />
          <Divider />
        </>
      )}

      {transactionInfo.hasCertificates && (
        <>
          <TxDetailsCertificates
            certificates={transactionInfo.rawCertificates}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID="sign-tx-certificates"
          />
          <Divider />
        </>
      )}

      {transactionInfo.hasProposalProcedures && (
        <>
          <TxDetailsProposalProcedures
            proposalProcedures={transactionInfo.proposalProcedures}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            explorerBaseUrl={explorerBaseUrl}
            testID="sign-tx-proposal-procedures"
          />
          <Divider />
        </>
      )}

      {transactionInfo.hasVotingProcedures && (
        <>
          <TxDetailsVotingProcedures
            votingProcedures={transactionInfo.votingProcedures}
            explorerBaseUrl={explorerBaseUrl}
            testID="sign-tx-voting-procedures"
          />
          <Divider />
        </>
      )}

      {transactionInfo.hasAuxiliaryData && transactionInfo.auxiliaryData && (
        <>
          <Column style={styles.fullWidthSection}>
            <TxDetailsAuxiliaryData
              auxiliaryData={transactionInfo.auxiliaryData}
              testID="sign-tx-auxiliary-data"
            />
          </Column>
          <Divider />
        </>
      )}

      <CollapsibleSection
        title={t('dapp-connector.cardano.sign-tx.raw-cbor-label')}
        testID="sign-tx-raw-data">
        <View style={styles.rawDataContainer}>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyRawData}
            testID="sign-tx-raw-data-copy">
            <Text.S style={styles.copyButtonText}>
              {isCopied
                ? t('dapp-connector.cardano.sign-tx.auxiliary-data.copied', {
                    defaultValue: 'Copied to clipboard',
                  })
                : t(
                    'dapp-connector.cardano.sign-tx.auxiliary-data.copy-button',
                    { defaultValue: 'Copy' },
                  )}
            </Text.S>
          </TouchableOpacity>
          <ScrollView
            style={styles.rawDataScroll}
            nestedScrollEnabled
            testID="sign-tx-raw-data-scroll">
            <Text.S style={styles.rawDataText} selectable>
              {txHex}
            </Text.S>
          </ScrollView>
        </View>
      </CollapsibleSection>
    </Column>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    fullWidthSection: {
      marginTop: spacing.L,
    },
    rawDataContainer: {
      position: 'relative',
    },
    copyButton: {
      position: 'absolute',
      top: spacing.XS,
      right: spacing.XS,
      zIndex: 1,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      backgroundColor: theme.background.primary,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.border.middle,
    },
    copyButtonText: {
      color: theme.text.primary,
      fontWeight: '600',
    },
    rawDataScroll: {
      maxHeight: 200,
      backgroundColor: theme.background.secondary,
      borderRadius: 8,
      padding: spacing.M,
    },
    rawDataText: {
      fontFamily: 'monospace',
      color: theme.text.primary,
      lineHeight: 20,
    },
  });
