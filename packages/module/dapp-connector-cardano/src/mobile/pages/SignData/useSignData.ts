import { useMemo } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useSignDataAccountInfo,
} from '../../../common/hooks';
import { useDappSignRequest } from '../../hooks/useDappSignRequest';

import type { SignDataDisplayDapp } from '../../../common/components/sign-data';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const useSignData = ({
  route: { params },
}: SheetScreenProps<SheetRoutes.SignData>) => {
  const pendingRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingSignDataRequest',
  );
  const webViewResponseQueue = useLaceSelector(
    'cardanoDappConnector.selectWebViewResponseQueue',
  );
  const accountInfo = useSignDataAccountInfo();

  const { requestId, dapp, address, payload } = params;

  const {
    handleConfirm,
    handleReject,
    handleCloseResult,
    isLoading,
    result: signDataResult,
  } = useDappSignRequest({
    requestId,
    pendingRequest,
    webViewResponseQueue,
    dispatchConfirm: useDispatchLaceAction(
      'cardanoDappConnector.confirmSignData',
    ),
    dispatchReject: useDispatchLaceAction(
      'cardanoDappConnector.rejectSignData',
    ),
    dispatchClearPendingRequest: useDispatchLaceAction(
      'cardanoDappConnector.clearPendingSignDataRequest',
    ),
    dispatchClearWebViewResponse: useDispatchLaceAction(
      'cardanoDappConnector.clearWebViewResponse',
    ),
  });

  const displayDapp = useMemo((): SignDataDisplayDapp | null => {
    if (!dapp) return null;
    return {
      icon: dapp.icon,
      name: dapp.name,
      origin: dapp.origin,
    };
  }, [dapp]);

  return {
    requestId,
    dapp: displayDapp,
    address,
    payload,
    handleConfirm,
    handleReject,
    handleCloseResult,
    signDataResult,
    isLoading,
    accountInfo,
  };
};
