import { useDispatchLaceAction, useLaceSelector } from '../../../common/hooks';
import {
  useSignTxData,
  type UseSignTxDataResult,
} from '../../../common/hooks/useSignTxData';
import { useDappSignRequest } from '../../hooks/useDappSignRequest';

import type { DappSignResult } from '../../hooks/useDappSignRequest';
import type {
  SheetParameterList,
  SheetRoutes,
  SheetScreenProps,
} from '@lace-lib/navigation';

type SignTxDapp = SheetParameterList[SheetRoutes.SignTx]['dapp'];

export interface UseSignTxResult extends UseSignTxDataResult {
  requestId: string;
  dapp: SignTxDapp;
  txHex: string;
  isPartialSign: boolean;
  handleConfirm: () => void;
  handleReject: () => void;
  handleCloseResult: () => void;
  isLoading: boolean;
  isSigning: boolean;
  signTxResult: DappSignResult | null;
}

export const useSignTx = ({
  route: { params },
}: SheetScreenProps<SheetRoutes.SignTx>): UseSignTxResult => {
  const pendingRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingSignTxRequest',
  );
  const webViewResponseQueue = useLaceSelector(
    'cardanoDappConnector.selectWebViewResponseQueue',
  );

  const { requestId, dapp, txHex, partialSign: isPartialSign } = params;

  const signTxData: UseSignTxDataResult = useSignTxData({ txHex });

  const {
    handleConfirm,
    handleReject,
    handleCloseResult,
    isLoading,
    isSigning,
    result: signTxResult,
  } = useDappSignRequest({
    requestId,
    pendingRequest,
    webViewResponseQueue,
    dispatchConfirm: useDispatchLaceAction(
      'cardanoDappConnector.confirmSignTx',
    ),
    dispatchReject: useDispatchLaceAction('cardanoDappConnector.rejectSignTx'),
    dispatchClearPendingRequest: useDispatchLaceAction(
      'cardanoDappConnector.clearPendingSignTxRequest',
    ),
    dispatchClearWebViewResponse: useDispatchLaceAction(
      'cardanoDappConnector.clearWebViewResponse',
    ),
  });

  return {
    ...signTxData,
    requestId,
    dapp,
    txHex,
    isPartialSign,
    handleConfirm,
    handleReject,
    handleCloseResult,
    isLoading,
    isSigning,
    signTxResult,
  };
};
