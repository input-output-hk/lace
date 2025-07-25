/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/no-multi-comp */
/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Search } from '@lace/common';
import styles from './SendStepOne.module.scss';
import mainStyles from './SendFlow.module.scss';
import { AssetInput, HANDLE_DEBOUNCE_TIME, isHandle } from '@lace/core';
import BigNumber from 'bignumber.js';
import { useFetchCoinPrice, useHandleResolver } from '@hooks';
import { CoreTranslationKey } from '@lace/translation';
import { Box, Flex, Text, ToggleButtonGroup } from '@input-output-hk/lace-ui-toolkit';
import { Bitcoin } from '@lace/bitcoin';
import { useTranslation } from 'react-i18next';
import { formatNumberForDisplay } from '@utils/format-number';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';
import { Asset } from '@cardano-sdk/core';
import debounce from 'lodash/debounce';
import { CustomConflictError, CustomError, ensureHandleOwnerHasntChanged, verifyHandle } from '@utils/validators';
import { AddressValue, HandleVerificationState } from './types';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { OpReturnMessageInput } from './OpReturnMessageInput';

const SATS_IN_BTC = 100_000_000;

interface RecommendedFee {
  key?: keyof Bitcoin.EstimatedFees | 'custom';
  label: string;
  feeRate?: number; // sats/vB
  estimatedTime: string; // e.g. "~10 min"
}

const fees: RecommendedFee[] = [
  { key: 'fast', label: 'High', feeRate: 10, estimatedTime: '~10 min' },
  { key: 'standard', label: 'Average', feeRate: 5, estimatedTime: '~30 min' },
  { key: 'slow', label: 'Slow', feeRate: 1, estimatedTime: '~60 min' },
  { key: 'custom', label: 'Custom', estimatedTime: '~?? min' }
];

interface SendStepOneProps {
  amount: string;
  onAmountChange: (value: string) => void;
  address: AddressValue;
  availableBalance: number;
  onAddressChange: (value: AddressValue) => void;
  feeMarkets: Bitcoin.EstimatedFees | null;
  onEstimatedTimeChange: (value: string) => void;
  onContinue: (feeRate: number) => void;
  isPopupView: boolean;
  onClose: () => void;
  network: Bitcoin.Network | null;
  hasUtxosInMempool: boolean;
  onOpReturnMessageChange: (value: string) => void;
  opReturnMessage: string;
}

const InputError = ({
  marginBottom,
  error,
  isPopupView
}: {
  marginBottom?: boolean;
  error: string;
  isPopupView: boolean;
}) => (
  <Box style={{ position: 'relative' }} w="$fill">
    <Box style={!isPopupView && !marginBottom ? { position: 'absolute', top: 0, left: 0 } : {}} pl="$24" py="$8">
      <Text.Body.Small color="error" weight="$semibold" data-testid="address-input-error">
        {error}
      </Text.Body.Small>
    </Box>
  </Box>
);

type HandleIcons = {
  [key in HandleVerificationState]: JSX.Element | undefined;
};

export const SendStepOne: React.FC<SendStepOneProps> = ({
  amount,
  onAmountChange,
  address,
  onAddressChange,
  availableBalance,
  feeMarkets,
  onEstimatedTimeChange,
  onContinue,
  isPopupView,
  onClose,
  network,
  hasUtxosInMempool,
  onOpReturnMessageChange,
  opReturnMessage
}) => {
  const { t } = useTranslation();
  const numericAmount = Number.parseFloat(amount) || 0;
  const hasNoValue = numericAmount === 0;
  const exceedsBalance = numericAmount > availableBalance / SATS_IN_BTC;
  const [feeRate, setFeeRate] = useState<number>(1);
  const handleResolver = useHandleResolver();

  const getFees = useCallback(
    () =>
      fees.map((fee) => ({
        ...fee,
        feeRate: fee.key !== 'custom' ? feeMarkets?.[fee.key]?.feeRate || fee.feeRate : fee.feeRate
      })),
    [feeMarkets]
  );

  const [handleVerificationState, setHandleVerificationState] = useState<HandleVerificationState | undefined>();
  const [recommendedFees, setRecommendedFees] = useState<RecommendedFee[]>(getFees());
  const [selectedFeeKey, setSelectedFeeKey] = useState<RecommendedFee['key']>(
    recommendedFees.find((f) => f.feeRate === feeRate)?.key || recommendedFees[1]?.key
  );
  const selectedFee = useMemo(
    () => recommendedFees.find((f) => f.key === selectedFeeKey),
    [recommendedFees, selectedFeeKey]
  );

  const [customFee, setCustomFee] = useState<string>('0');
  const [customFeeError, setCustomFeeError] = useState<string | undefined>();
  const [isValidAddress, setIsValidAddress] = useState<boolean>(false);
  const [invalidAddressError, setInvalidAddressError] = useState<string | undefined>();
  const [icon, setIcon] = useState<JSX.Element | undefined>();

  const calcIcon = debounce((state: HandleVerificationState | undefined) => {
    const handleIcons: HandleIcons = {
      [HandleVerificationState.VALID]: <CheckCircleOutlined className={styles.valid} />,
      [HandleVerificationState.CHANGED_OWNERSHIP]: <CheckCircleOutlined className={styles.valid} />,
      [HandleVerificationState.INVALID]: <ExclamationCircleOutlined className={styles.invalid} />,
      [HandleVerificationState.VERIFYING]: <LoadingOutlined className={styles.loading} />
    };
    const handleIcon = (state && handleIcons[state]) || undefined;
    setIcon(handleIcon);
  }, HANDLE_DEBOUNCE_TIME);

  useEffect(() => {
    calcIcon(handleVerificationState);
    return () => calcIcon.cancel();
  }, [handleVerificationState, calcIcon]);

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
    if (
      hasNoValue || exceedsBalance || address?.isHandle
        ? address?.resolvedAddress.trim() === ''
        : address?.address.trim() === ''
    )
      return;

    const newFeeRate =
      selectedFeeKey === 'custom'
        ? Number.parseFloat(((Number.parseFloat(customFee) / SATS_IN_BTC) * 1000).toFixed(8))
        : selectedFee?.feeRate;

    setFeeRate(newFeeRate);
    onEstimatedTimeChange(selectedFee?.estimatedTime);
    onContinue(newFeeRate);
  };
  const { priceResult } = useFetchCoinPrice();
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);

  const enteredAmount = useMemo(() => numericAmount * bitcoinPrice, [numericAmount, bitcoinPrice]);

  const coin = {
    id: 'btc',
    ticker: 'BTC',
    balance: `${t('browserView.transaction.btc.send.balance')}: ${(availableBalance / SATS_IN_BTC).toFixed(8)}`
  };

  const fiatValue = `≈ ${new BigNumber(enteredAmount.toString()).toFixed(2, BigNumber.ROUND_HALF_UP)} USD`;

  const isAddressInputInvalidHandle =
    isAdaHandleEnabled &&
    isHandle(address?.address) &&
    !Asset.util.isValidHandle(address?.address?.toString().slice(1).toLowerCase());

  const isAddressInputValueHandle = isAdaHandleEnabled && isHandle(address?.address);

  const resolveHandle = useMemo(
    () =>
      debounce(async () => {
        setHandleVerificationState(HandleVerificationState.VERIFYING);

        if (isAddressInputInvalidHandle) {
          setHandleVerificationState(HandleVerificationState.INVALID);
        }
        if (!address?.handleResolution) {
          const { valid, handles } = await verifyHandle(address?.address, handleResolver);

          if (valid && !!handles[0].addresses?.bitcoin) {
            setHandleVerificationState(HandleVerificationState.VALID);

            onAddressChange({
              address: address?.address,
              resolvedAddress: handles[0].addresses?.bitcoin,
              isHandle: true,
              handleResolution: handles[0]
            });
          } else {
            setHandleVerificationState(HandleVerificationState.INVALID);
          }
          return;
        }

        try {
          await ensureHandleOwnerHasntChanged({
            force: true,
            handleResolution: address?.handleResolution,
            handleResolver
          });

          setHandleVerificationState(HandleVerificationState.VALID);
        } catch (error) {
          if (error instanceof CustomError && error.isValidHandle === false) {
            setHandleVerificationState(HandleVerificationState.INVALID);
          }
          if (error instanceof CustomConflictError) {
            setHandleVerificationState(HandleVerificationState.CHANGED_OWNERSHIP);
          }
        }
      }, HANDLE_DEBOUNCE_TIME),
    [address?.address, address?.handleResolution, onAddressChange, handleResolver, isAddressInputInvalidHandle]
  );

  useEffect(() => {
    if (!address) {
      return;
    }

    if (isAddressInputValueHandle) {
      resolveHandle();
    } else {
      // eslint-disable-next-line unicorn/no-useless-undefined
      setHandleVerificationState(undefined);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      resolveHandle && resolveHandle.cancel();
    };
  }, [address, setHandleVerificationState, resolveHandle, isAddressInputValueHandle]);

  useEffect(() => {
    if (handleVerificationState === HandleVerificationState.VERIFYING) return;

    if (isAddressInputValueHandle) {
      if (
        !address?.isHandle ||
        isAddressInputInvalidHandle ||
        handleVerificationState === HandleVerificationState.INVALID
      ) {
        setIsValidAddress(false);
        setInvalidAddressError(t('core.destinationAddressInput.invalidBitcoinHandle'));
        return;
      }

      if (handleVerificationState === HandleVerificationState.CHANGED_OWNERSHIP) {
        setIsValidAddress(false);
        setInvalidAddressError(t('core.destinationAddressInput.handleChangedOwner'));
        return;
      }
    }

    const addressToValidate = address?.isHandle ? address?.resolvedAddress : address?.address;

    if (!addressToValidate) return;
    const result = Bitcoin.validateBitcoinAddress(addressToValidate, network);

    switch (result) {
      case Bitcoin.AddressValidationResult.Valid:
        setIsValidAddress(true);
        // eslint-disable-next-line unicorn/no-useless-undefined
        setInvalidAddressError(undefined);
        break;
      case Bitcoin.AddressValidationResult.InvalidNetwork:
        setIsValidAddress(false);
        setInvalidAddressError(t('general.errors.incorrectAddressNetwork'));
        break;
      case Bitcoin.AddressValidationResult.InvalidAddress:
        setIsValidAddress(false);
        setInvalidAddressError(t('general.errors.incorrectAddress'));
        break;
    }
  }, [
    isAddressInputValueHandle,
    isAddressInputInvalidHandle,
    handleVerificationState,
    address,
    network,
    onAddressChange,
    t
  ]);

  const handleCustomFeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const disallowedKeys = ['-', '+', 'e', ','];
    const targetValue = Number(e.currentTarget.value);

    if (disallowedKeys.includes(e.key) || (e.key === 'ArrowDown' && targetValue <= 0)) {
      e.preventDefault();
    }
  };

  const onCustomFeeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setCustomFee(e.target.value || '0');
  };

  return (
    <Flex className={mainStyles.container} flexDirection="column" w="$fill">
      <Flex flexDirection="column" w="$fill" className={mainStyles.container}>
        {isPopupView && <Text.Heading weight="$bold">{t('browserView.transaction.send.title')}</Text.Heading>}
        {hasUtxosInMempool && (
          <InputError
            marginBottom
            error="You cannot send transactions while previous transactions are still pending."
            isPopupView={isPopupView}
          />
        )}

        <Search
          disabled={hasUtxosInMempool}
          value={address?.address}
          data-testid="btc-address-input"
          label={t('core.destinationAddressInput.recipientAddressOnly')}
          onChange={(value) => {
            setHandleVerificationState(HandleVerificationState.VERIFYING);
            // eslint-disable-next-line unicorn/no-useless-undefined
            setInvalidAddressError(undefined);
            onAddressChange({ isHandle: false, address: value, resolvedAddress: '' });
          }}
          style={{ width: '100%' }}
          customIcon={icon}
        />

        {!isValidAddress && !!address?.address?.length && (
          <InputError error={invalidAddressError} isPopupView={isPopupView} />
        )}

        <Box w="$fill" mt={isPopupView ? '$16' : '$40'} py="$24" px="$32" className={styles.amountSection}>
          <AssetInput
            disabled={hasUtxosInMempool}
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
            displayValue={formatNumberForDisplay(amount, 15)}
            focused
          />
        </Box>

        <OpReturnMessageInput
          opReturnMessage={opReturnMessage}
          disabled={hasUtxosInMempool}
          onOpReturnMessageChange={onOpReturnMessageChange}
        />

        <Box mt={isPopupView ? '$24' : '$32'}>
          {isPopupView ? (
            <Text.Body.Large weight="$bold">{t('browserView.transaction.btc.send.feeRate')}</Text.Body.Large>
          ) : (
            <Text.SubHeading weight="$bold">{t('browserView.transaction.btc.send.feeRate')}</Text.SubHeading>
          )}
        </Box>

        <Flex mt={isPopupView ? '$16' : '$32'} w="$fill">
          <ToggleButtonGroup.Root
            disabled={hasUtxosInMempool}
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
                step="0.1"
                type="number"
                label={t('browserView.transaction.btc.send.feeRateCustom')}
                disabled={hasUtxosInMempool}
                value={customFee}
                data-testid="btc-add-custom-fee"
                bordered={false}
                onChange={(e) => {
                  const normalizedValue = e.target.value.replace(',', '.');
                  setCustomFee(normalizedValue);
                }}
                onKeyDown={handleCustomFeeKeyDown}
                onWheel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.blur();
                }}
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                onBlur={onCustomFeeBlur}
                filledLabelOnFocus
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
          disabled={
            hasNoValue ||
            exceedsBalance ||
            !address ||
            address?.address?.trim() === '' ||
            !isValidAddress ||
            opReturnMessage?.length > 80
          }
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
