import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { useTranslation } from '@lace-contract/i18n';
import { FeeSection as FeeSectionUI } from '@lace-lib/ui-toolkit';
import {
  convertAmountToDenominated,
  createUICustomisation,
  valueToLocale,
} from '@lace-lib/util-render';
import React from 'react';

const BITCOIN_DECIMALS = 8;

import { useFeeSection } from '../hooks/useFeeSection';

import type { SendFlowSheetUICustomisation } from '@lace-contract/app';
import type { NetworkType } from '@lace-contract/network';
import type { FeeEntry } from '@lace-lib/ui-toolkit';

const formatFeeEntryForDisplay: NonNullable<
  SendFlowSheetUICustomisation['formatFeeEntryForDisplay']
> = ({ feeAmount, token }) => {
  const shouldDisplayAsSats = token.displayShortName === 'BTC';
  const decimals = shouldDisplayAsSats ? 0 : token.decimals ?? 0;
  const denominatedAmount = convertAmountToDenominated(feeAmount, decimals);
  const displayToken: FeeEntry['token'] = shouldDisplayAsSats
    ? { ...token, displayShortName: 'Sats' }
    : token;
  return { amount: valueToLocale(denominatedAmount), token: displayToken };
};

/**
 * Bitcoin fee section: uses useFeeSection from send-flow and renders the shared FeeSection UI.
 * Used as the FeeSection in send-flow-sheet-ui-customization for Bitcoin.
 */
export const BitcoinFeeSection = () => {
  const { t } = useTranslation();
  const data = useFeeSection();

  return (
    <FeeSectionUI
      copies={{
        customFeeLabel: t('v2.send-flow.form.custom-fee-label'),
      }}
      values={{
        feeOptions: data.feeOptions,
        feeRateOption: data.feeRateOption,
        customFeeRate: data.customFeeRate,
      }}
      actions={{
        onFeeOptionChange: data.handleFeeOptionChange,
        onCustomFeeChange: data.handleCustomFeeChange,
      }}
    />
  );
};

const sendFlowSheetUICustomisation = (): SendFlowSheetUICustomisation =>
  createUICustomisation<SendFlowSheetUICustomisation>({
    key: 'bitcoin',
    uiCustomisationSelector: ({ blockchainOfTheTransaction }) =>
      blockchainOfTheTransaction === 'Bitcoin',
    showNoteSection: true,
    showMaxButton: true,
    showFiatConversion: true,
    isProcessingResultSheetClosable: true,
    FeeSection: BitcoinFeeSection,
    canSendMoreThanOneAsset: false,
    formatFeeEntryForDisplay,
    nativeTokenInfo: (_params: { networkType: NetworkType }) => ({
      tokenId: BITCOIN_TOKEN_ID,
      decimals: BITCOIN_DECIMALS,
      displayShortName: 'BTC',
    }),
  });

export default sendFlowSheetUICustomisation;
