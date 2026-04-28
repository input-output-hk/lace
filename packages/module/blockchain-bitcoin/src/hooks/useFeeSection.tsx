import { useTranslation } from '@lace-contract/i18n';
import {
  isSendFlowClosed,
  isSendFlowFormStep,
  isSendFlowSuccess,
  useSendFlow,
} from '@lace-contract/send-flow';
import BigNumberJs from 'bignumber.js';
import debounce from 'lodash/fp/debounce';
import { useMemo, useEffect, useCallback, useRef } from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../hooks';

import type { FeeOption, FeeOptionTabItem } from '@lace-lib/ui-toolkit';

const SATS_IN_BTC = new BigNumberJs(100_000_000);
const BTC_SATS_PER_VBYTE_FACTOR = new BigNumberJs(1000);

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
                  customFeeRate: value.customFeeRate
                    ? new BigNumberJs(value.customFeeRate)
                        .div(SATS_IN_BTC)
                        .times(BTC_SATS_PER_VBYTE_FACTOR)
                        .toNumber()
                    : 0,
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
              customFeeRate: customFeeRate
                ? new BigNumberJs(customFeeRate)
                    .div(SATS_IN_BTC)
                    .times(BTC_SATS_PER_VBYTE_FACTOR)
                    .toNumber()
                : 0,
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
