import {
  DUST_TOKEN_DECIMALS,
  getDustTokenIdByNetwork,
  getDustTokenTickerByNetwork,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { createUICustomisation } from '@lace-lib/util-render';

import { SendNotices } from '../components/send-flow';
import { ProofServerReviewNotice } from '../components/send-flow/ProofServerReviewNotice';
import { TeeAttestationProgressList } from '../components/send-flow/TeeAttestationProgressList';
import { SendSheetFooterTitleRow } from '../components/SendSheetFooterTitleRow';

import { computeTxRestrictions } from './computeTxRestrictions';

import type { SendFlowSheetUICustomisation } from '@lace-contract/app';

const sendFlowSheetUICustomisation = (): SendFlowSheetUICustomisation =>
  createUICustomisation<SendFlowSheetUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: ({ blockchainOfTheTransaction }) =>
      blockchainOfTheTransaction === 'Midnight',
    showNoteSection: false,
    showMaxButton: false,
    showFiatConversion: false,
    hidePrimaryButtonOnSuccess: true,
    nativeTokenInfo: ({ networkType }) => ({
      tokenId: getDustTokenIdByNetwork(MidnightSDKNetworkIds.MainNet),
      decimals: DUST_TOKEN_DECIMALS,
      displayShortName: getDustTokenTickerByNetwork(networkType),
    }),
    SheetFooterTitleRow: SendSheetFooterTitleRow,
    isProcessingResultSheetClosable: false,
    NoticeComponent: SendNotices,
    ReviewNoticeComponent: ProofServerReviewNotice,
    ProcessingDetail: TeeAttestationProgressList,
    computeTxRestrictions,
    canSendMoreThanOneAsset: true,
  });

export default sendFlowSheetUICustomisation;
