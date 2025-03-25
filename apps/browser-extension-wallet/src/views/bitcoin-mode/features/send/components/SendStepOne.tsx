/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/no-multi-comp */
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
import { Bitcoin } from '@lace/bitcoin';
import { useTranslation } from 'react-i18next';

const SATS_IN_BTC = 100_000_000;
const CUSTOM_FEE_STEP = 0.1;

interface RecommendedFee {
  key?: keyof Bitcoin.EstimatedFees | 'custom';
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
  feeMarkets: Bitcoin.EstimatedFees | null;
  onEstimatedTimeChange: (value: string) => void;
  onContinue: () => void;
  isPopupView: boolean;
  onClose: () => void;
  network: Bitcoin.Network | null;
}

const InputError = ({ error, isPopupView }: { error: string; isPopupView: boolean }) => (
  <Box style={{ position: 'relative' }} w="$fill">
    <Box style={!isPopupView ? { position: 'absolute', top: 0, left: 0 } : {}} pl="$24" py="$8">
      <Text.Body.Small color="error" weight="$semibold" data-testid="address-input-error">
        {error}
      </Text.Body.Small>
    </Box>
  </Box>
);

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
  onClose,
  network
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
  const [customFee, setCustomFee] = useState<string>('');
  const [customFeeError, setCustomFeeError] = useState<string | undefined>();
  const [isValidAddress, setIsValidAddress] = useState<boolean>(false);

  useEffect(() => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    setCustomFeeError(undefined);
    if (selectedFeeKey !== 'custom' || !feeMarkets) return;

    if (Number.parseFloat(customFee) < Number.parseFloat(((feeMarkets.slow.feeRate * SATS_IN_BTC) / 1000).toFixed(2))) {
      setCustomFeeError(t('browserView.transaction.btc.send.error.feeTooLow'));
    } else if (
      Number.parseFloat(customFee) > Number.parseFloat(((feeMarkets.fast.feeRate * SATS_IN_BTC) / 1000).toFixed(2))
    ) {
      setCustomFeeError(t('browserView.transaction.btc.send.error.feeTooHigh'));
    }
  }, [customFee, feeMarkets, selectedFeeKey, t]);

  useEffect(() => {
    setRecommendedFees(getFees());
  }, [getFees]);

  const handleNext = () => {
    if (hasNoValue || exceedsBalance || address.trim() === '') return;

    onFeeRateChange(
      selectedFeeKey === 'custom'
        ? Number.parseFloat(((Number.parseFloat(customFee) / SATS_IN_BTC) * 1000).toFixed(8))
        : selectedFee?.feeRate
    );
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

  const handleChangeAddress = useCallback(
    (value: string) => {
      onAddressChange(value);
      if (Bitcoin.isValidBitcoinAddress(value, network)) {
        setIsValidAddress(true);
      } else {
        setIsValidAddress(false);
      }
    },
    [network, onAddressChange]
  );

  const handleCustomFeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const disallowedKeys = ['-', '+', 'e'];
    const targetValue = Number(target.value);

    if (disallowedKeys.includes(e.key) || (e.key === 'ArrowDown' && targetValue <= 0)) {
      e.preventDefault();
    }
  };

  return (
    <Flex className={mainStyles.container} flexDirection="column" w="$fill">
      <Flex flexDirection="column" w="$fill" className={mainStyles.container}>
        {isPopupView && <Text.Heading weight="$bold">{t('browserView.transaction.send.title')}</Text.Heading>}
        <Search
          disabled={false}
          value={address}
          data-testid="btc-address-input"
          label={t('core.destinationAddressInput.recipientAddressOnly')}
          onChange={(value) => handleChangeAddress(value)}
          style={{ width: '100%' }}
        />

        {!isValidAddress && !!address?.length && (
          <InputError error={t('general.errors.incorrectAddress')} isPopupView={isPopupView} />
        )}

        <Box w="$fill" mt={isPopupView ? '$16' : '$40'} py="$24" px="$32" className={styles.amountSection}>
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
        <Flex w="$fill" mt={isPopupView ? '$16' : '$32'} justifyContent="space-between" mb="$8">
          {selectedFeeKey !== 'custom' ? (
            <>
              <Text.Body.Normal weight="$semibold">{t('browserView.transaction.send.transactionFee')}</Text.Body.Normal>
              <Flex flexDirection="column" alignItems="flex-end">
                <Text.Body.Normal weight="$medium">
                  {((selectedFee.feeRate * SATS_IN_BTC) / 1000).toFixed(2)} sats/vB
                </Text.Body.Normal>
                <Text.Body.Normal weight="$medium">{selectedFee.estimatedTime}</Text.Body.Normal>
              </Flex>
            </>
          ) : (
            <Box w="$fill">
              <Input
                className={styles.feeInput}
                step={CUSTOM_FEE_STEP}
                type="number"
                label={t('browserView.transaction.btc.send.feeRateCustom')}
                disabled={false}
                value={customFee}
                data-testid="btc-add-custom-fee"
                bordered={false}
                onChange={(e) => {
                  setCustomFee(e.target.value);
                }}
                onKeyDown={handleCustomFeeKeyDown}
                onWheel={(e) => {
                  e.preventDefault();

                  const step = CUSTOM_FEE_STEP;
                  const currentValue = Number(customFee);

                  // Handle scrolling up (increment) or down (decrement but not below 0)
                  const newValue = Math.max(e.deltaY < 0 ? currentValue + step : Math.max(0, currentValue - step), 0);

                  // Only update if value changed
                  if (newValue !== currentValue) {
                    setCustomFee(newValue.toFixed(1));
                  }
                }}
              />
              {customFeeError && <InputError error={customFeeError} isPopupView={isPopupView} />}
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
          disabled={hasNoValue || exceedsBalance || address.trim() === '' || !isValidAddress}
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
