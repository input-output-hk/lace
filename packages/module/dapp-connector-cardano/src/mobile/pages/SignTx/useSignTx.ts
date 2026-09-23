import { useSignTxRefusal } from '../../../common/components/useSignTxRefusal';
import { useDispatchLaceAction, useLaceSelector } from '../../../common/hooks';
import {
  useSignTxData,
  type UseSignTxDataResult,
} from '../../../common/hooks/useSignTxData';
import { useDappSignRequest } from '../../hooks/useDappSignRequest';

import type { SignTxRefusalDetails } from '../../../common/components/sign-tx-refused-keys';
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
  /** The collateral guard's verdict for this request, or `null` (LW-15498). */
  refusal: SignTxRefusalDetails | null;
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

  // The verdict comes from the pending slot, the only channel that carries it.
  const refusal = useSignTxRefusal({
    collateralRefusal: pendingRequest?.collateralRefusal,
    dappOrigin: pendingRequest?.dapp?.origin,
  });

  const signTxData: UseSignTxDataResult = useSignTxData({
    // A refused request renders nothing transaction-derived, so it is not
    // inspected, resolved or priced either -- the CBOR is hostile.
    txHex: refusal ? '' : txHex,
    dappOrigin: dapp?.origin,
  });

  const {
    handleConfirm,
    handleReject,
    handleCloseResult,
    isLoading,
    isSigning,
    result: signTxResult,
  } = useDappSignRequest({
    signingType: 'signTx',
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
    // The queued code-1 answer IS the refusal, not a result to show over it.
    signTxResult: refusal ? null : signTxResult,
    refusal,
  };
};
