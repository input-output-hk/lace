/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Search } from '@lace/common';
import styles from './SendStepOne.module.scss';
import mainStyles from './SendFlow.module.scss';
import { AssetInput } from '@lace/core';
import BigNumber from 'bignumber.js';
import { useFetchCoinPrice } from '@hooks';
import { CoreTranslationKey } from '@lace/translation';
import { Box, Flex, Text, ToggleButtonGroup } from '@input-output-hk/lace-ui-toolkit';
import { BitcoinWallet } from '@lace/bitcoin';
import { useTranslation } from 'react-i18next';

const SATS_IN_BTC = 100_000_000;

interface RecommendedFee {
  key?: keyof BitcoinWallet.EstimatedFees | 'custom';
  label: string;
  feeRate?: number; // sats/vB
  estimatedTime: string; // e.g. "~10 min"
}

const fees: RecommendedFee[] = [
  { key: 'fast', label: 'Fast', feeRate: 10, estimatedTime: '~10 min' },
  { key: 'standard', label: 'Average', feeRate: 5, estimatedTime: '~30 min' },
  { key: 'slow', label: 'Low', feeRate: 1, estimatedTime: '~60 min' },
  { key: 'custom', label: 'Custom', estimatedTime: '~?? min' }
];

interface SendStepOneProps {
  amount: string;
  onAmountChange: (value: string) => void;
  address: string;
  availableBalance: number;
  onAddressChange: (value: string) => void;
  feeRate: number;
  onFeeRateChange: (value: number) => void;
  feeMarkets: BitcoinWallet.EstimatedFees | null;
  onEstimatedTimeChange: (value: string) => void;
  onContinue: () => void;
  isPopupView: boolean;
  onClose: () => void;
}

export const SendStepOne: React.FC<SendStepOneProps> = ({
  amount,
  onAmountChange,
  address,
  onAddressChange,
  availableBalance,
  feeRate,
  onFeeRateChange,
  feeMarkets,
  onEstimatedTimeChange,
  onContinue,
  isPopupView,
  onClose
}) => {
  const { t } = useTranslation();
  const numericAmount = Number.parseFloat(amount) || 0;
  const hasNoValue = numericAmount === 0;
  const exceedsBalance = numericAmount > availableBalance / SATS_IN_BTC;

  const getFees = useCallback(
    () =>
      fees.map((fee) => ({
        ...fee,
        feeRate: fee.key !== 'custom' ? feeMarkets?.[fee.key]?.feeRate || fee.feeRate : fee.feeRate
      })),
    [feeMarkets]
  );

  const [recommendedFees, setRecommendedFees] = useState<RecommendedFee[]>(getFees());
  const [selectedFeeKey, setSelectedFeeKey] = useState<RecommendedFee['key']>(
    recommendedFees.find((f) => f.feeRate === feeRate)?.key || recommendedFees[1]?.key
  );
  const selectedFee = useMemo(
    () => recommendedFees.find((f) => f.key === selectedFeeKey),
    [recommendedFees, selectedFeeKey]
  );
  const [customFee, setCustomFee] = useState<number>(feeRate);

  useEffect(() => {
    setRecommendedFees(getFees());
  }, [getFees]);

  const handleNext = () => {
    if (hasNoValue || exceedsBalance || address.trim() === '') return;

    onFeeRateChange(selectedFeeKey === 'custom' ? customFee : selectedFee?.feeRate);
    onEstimatedTimeChange(selectedFee?.estimatedTime);
    onContinue();
  };
  const { priceResult } = useFetchCoinPrice();
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);

  const enteredAmount = useMemo(() => numericAmount * bitcoinPrice, [numericAmount, bitcoinPrice]);

  const coin = {
    id: 'btc',
    ticker: 'BTC',
    balance: `${t('browserView.transaction.btc.send.balance')}: ${(availableBalance / SATS_IN_BTC).toFixed(8)} BTC`
  };

  const fiatValue = `${new BigNumber(enteredAmount.toString()).toFixed(2, BigNumber.ROUND_HALF_UP)} USD`;

  return (
    <Flex className={mainStyles.container} flexDirection="column" w="$fill">
      <Flex flexDirection="column" w="$fill" className={mainStyles.container}>
        {isPopupView && <Text.Heading weight="$bold">{t('browserView.transaction.send.title')}</Text.Heading>}
        <Search
          disabled={false}
          value={address}
          data-testid="btc-address-input"
          label={t('core.destinationAddressInput.recipientAddressOnly')}
          onChange={(value) => onAddressChange(value)}
          style={{ width: '100%' }}
        />

        <Box w="$fill" mt={isPopupView ? '$16' : '$20'} py="$24" px="$32" className={styles.amountSection}>
          <AssetInput
            inputId="BTC"
            coin={coin}
            value={amount}
            onChange={({ value }) => onAmountChange(value)}
            fiatValue={fiatValue}
            getErrorMessage={() => t('general.errors.insufficientBalance') as unknown as CoreTranslationKey}
            error={t('general.errors.insufficientBalance')}
            invalid={exceedsBalance}
            isPopupView={isPopupView}
            hasMaxBtn={false}
          />
        </Box>

        <Box mt={isPopupView ? '$24' : '$32'}>
          {isPopupView ? (
            <Text.Body.Large weight="$bold">{t('browserView.transaction.btc.send.feeRate')}</Text.Body.Large>
          ) : (
            <Text.SubHeading weight="$bold">{t('browserView.transaction.btc.send.feeRate')}</Text.SubHeading>
          )}
        </Box>

        <Flex mt={isPopupView ? '$16' : '$32'} w="$fill">
          <ToggleButtonGroup.Root
            onValueChange={(feeKey: RecommendedFee['key']) => {
              setSelectedFeeKey(feeKey);
            }}
            value={selectedFeeKey}
          >
            {recommendedFees.map(({ key, label }) => (
              <ToggleButtonGroup.Item key={key} value={key}>
                {label}
              </ToggleButtonGroup.Item>
            ))}
          </ToggleButtonGroup.Root>
        </Flex>
        <Flex w="$fill" mt={isPopupView ? '$16' : '$32'} justifyContent="space-between">
          <Text.Body.Normal weight="$semibold">{t('browserView.transaction.send.transactionFee')}</Text.Body.Normal>
          {selectedFeeKey !== 'custom' ? (
            <Flex flexDirection="column" alignItems="flex-end">
              <Text.Body.Normal weight="$medium">
                {((selectedFee.feeRate * SATS_IN_BTC) / 1000).toFixed(2)} sats/vB
              </Text.Body.Normal>
              <Text.Body.Normal weight="$medium">{selectedFee.estimatedTime}</Text.Body.Normal>
            </Flex>
          ) : (
            <Box className={styles.customFee}>
              <Input
                label={
                  isPopupView
                    ? t('browserView.transaction.btc.popup.send.feeRateCustom')
                    : t('browserView.transaction.btc.send.feeRateCustom')
                }
                type="number"
                disabled={false}
                value={customFee.toString()}
                data-testid="btc-add-custom-fee"
                bordered={false}
                onChange={(e) => setCustomFee(Number(e.target.value))}
              />
            </Box>
          )}
        </Flex>
      </Flex>

      <Flex
        w="$fill"
        py="$24"
        pb={isPopupView ? '$0' : '$24'}
        px="$40"
        flexDirection="column"
        gap={isPopupView ? '$8' : '$16'}
        className={mainStyles.buttons}
      >
        <Button
          disabled={hasNoValue || exceedsBalance || address.trim() === ''}
          color="primary"
          block
          size="medium"
          onClick={handleNext}
          data-testid="continue-button"
        >
          {t('browserView.transaction.send.footer.review')}
        </Button>
        <Button color="secondary" block size="medium" onClick={onClose} data-testid="back-button">
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
