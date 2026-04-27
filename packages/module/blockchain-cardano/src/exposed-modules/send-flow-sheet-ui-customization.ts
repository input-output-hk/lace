import { getCardanoNativeTokenInfoForNetwork } from '@lace-contract/cardano-context';
import { createUICustomisation } from '@lace-lib/util-render';

import type { SendFlowSheetUICustomisation } from '@lace-contract/app';

const sendFlowSheetUICustomisation = (): SendFlowSheetUICustomisation =>
  createUICustomisation<SendFlowSheetUICustomisation>({
    key: 'cardano',
    uiCustomisationSelector: ({ blockchainOfTheTransaction }) =>
      blockchainOfTheTransaction === 'Cardano',
    showNoteSection: true,
    showMaxButton: true,
    showFiatConversion: true,
    isProcessingResultSheetClosable: true,
    nativeTokenInfo: ({ networkType }) =>
      getCardanoNativeTokenInfoForNetwork(networkType),
    canSendMoreThanOneAsset: true,
  });

export default sendFlowSheetUICustomisation;
