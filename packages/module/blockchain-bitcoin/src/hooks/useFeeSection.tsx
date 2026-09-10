import { feeRateFromSatsPerVByte } from '@lace-contract/bitcoin-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  isSendFlowClosed,
  isSendFlowFormStep,
  isSendFlowSuccess,
  useSendFlow,
} from '@lace-contract/send-flow';
import debounce from 'lodash/fp/debounce';
import { useMemo, useEffect, useCallback, useRef } from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../hooks';

import type { FeeOption, FeeOptionTabItem } from '@lace-lib/ui-toolkit';

/**
 * The custom-fee field holds what the user typed, in sat/vB. An entry the
 * conversion refuses (empty, zero, negative, unparseable, absurdly large)
 * yields no rate, never the 0 that used to build a fee-less transaction.
 */
const toCustomFeeRate = (typedSatsPerVByte: string | undefined) =>
  feeRateFromSatsPerVByte(Number(typedSatsPerVByte));

export const useFeeSection = () => {
  const { t } = useTranslation();
  const { feeRateOption, setFeeRateOption, customFeeRate, setCustomFeeRate } =
    useSendFlow();

  const dispatchFormDataChanged = useDispatchLaceAction(
    'sendFlow.formDataChanged',
  );
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');

  const isFlowOpen =
    !isSendFlowClosed(sendFlowState) && !isSendFlowSuccess(sendFlowState);
  const currentBlockchainSpecific = isSendFlowFormStep(sendFlowState)
    ? sendFlowState.form.blockchainSpecific?.value
    : undefined;

  const currentBlockchainSpecificRef = useRef(currentBlockchainSpecific);
  currentBlockchainSpecificRef.current = currentBlockchainSpecific;

  const feeOptions = useMemo<FeeOptionTabItem[]>(
    () => [
      {
        label: t('v2.send-flow.form.fee-options.fast'),
        value: 'Fast',
      },
      {
        label: t('v2.send-flow.form.fee-options.average'),
        value: 'Average',
      },
      { label: t('v2.send-flow.form.fee-options.low'), value: 'Low' },
      {
        label: t('v2.send-flow.form.fee-options.custom'),
        value: 'Custom',
      },
    ],
    [t],
  );

  const debouncedFeeRateDispatch = useMemo(
    () =>
      debounce(
        500,
        (value: { feeOption: FeeOption; customFeeRate?: string }) => {
          const latest = currentBlockchainSpecificRef.current;
          dispatchFormDataChanged({
            data: {
              fieldName: 'blockchainSpecific',
              value: {
                ...(latest as object),
                feeRate: {
                  feeOption: value.feeOption,
                  customFeeRate: toCustomFeeRate(value.customFeeRate),
                },
              },
            },
          });
        },
      ),
    [dispatchFormDataChanged],
  );

  useEffect(
    () => () => {
      debouncedFeeRateDispatch.cancel();
    },
    [debouncedFeeRateDispatch],
  );

  // Initialize fee section blockchainSpecific when flow opens (e.g. Bitcoin)
  const hasInitializedFeeRef = useRef(false);
  useEffect(() => {
    if (isFlowOpen && !hasInitializedFeeRef.current) {
      hasInitializedFeeRef.current = true;
      dispatchFormDataChanged({
        data: {
          fieldName: 'blockchainSpecific',
          value: {
            feeRate: {
              feeOption: feeRateOption,
              customFeeRate: toCustomFeeRate(customFeeRate),
            },
          },
        },
      });
    }
    if (!isFlowOpen) hasInitializedFeeRef.current = false;
  }, [isFlowOpen, feeRateOption, customFeeRate, dispatchFormDataChanged]);

  const handleFeeOptionChange = useCallback(
    (option: FeeOption) => {
      setFeeRateOption(option);
      debouncedFeeRateDispatch({
        feeOption: option,
        customFeeRate: option === 'Custom' ? customFeeRate : undefined,
      });
    },
    [setFeeRateOption, debouncedFeeRateDispatch, customFeeRate],
  );

  const handleCustomFeeChange = useCallback(
    (value: string) => {
      setCustomFeeRate(value);
      debouncedFeeRateDispatch({
        feeOption: 'Custom',
        customFeeRate: value,
      });
    },
    [setCustomFeeRate, debouncedFeeRateDispatch],
  );

  return useMemo(
    () => ({
      feeOptions,
      feeRateOption,
      customFeeRate,
      handleFeeOptionChange,
      handleCustomFeeChange,
    }),
    [
      feeOptions,
      feeRateOption,
      customFeeRate,
      handleFeeOptionChange,
      handleCustomFeeChange,
    ],
  );
};
