import { isHardwareWallet } from '@lace-contract/wallet-repo';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';

import { SignDataLayout, SignDataResult } from '../../common/components';
import { useLaceSelector } from '../../common/hooks';
import { useSignDataAccountInfo } from '../../common/hooks/useSignDataAccountInfo';
import { useSignDataDRepKeyHash } from '../../common/hooks/useSignDataDRepKeyHash';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

import type { SignDataContentProps } from '../../common/components/sign-data';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
});

type CardanoDappSignDataProps = {
  /** The request this sheet presents, from its route params. */
  requestId: string;
};

/**
 * Extension popup for CIP-8 sign data. Same shell and body as mobile (`SignDataLayout` / `SignDataContent`).
 */
export const CardanoDappSignData = ({
  requestId,
}: CardanoDappSignDataProps) => {
  // The route param, not the synced request: it is the discriminator the slot
  // is matched against, and it outlives the request being cleared — which a
  // port drop can do before this view ever renders one.
  const requestIdRef = useRef<string | undefined>(requestId);
  requestIdRef.current = requestId;
  const closeDappView = useDappViewClose(undefined, requestIdRef);

  const {
    request,
    handleConfirm,
    handleReject,
    isLoading,
    isComplete,
    isError,
  } = useDappPopupFlow({
    type: 'signData',
    onReject: closeDappView,
  });

  const accountInfo = useSignDataAccountInfo(request?.dappOrigin);
  const dRepKeyHash = useSignDataDRepKeyHash(request?.dappOrigin);
  const hwErrorKeys = useLaceSelector(
    'cardanoDappConnector.selectSignDataHwErrorKeys',
  );

  const sessionAccountByOrigin = useLaceSelector(
    'cardanoDappConnector.selectSessionAccountByOrigin',
  );
  const allWallets = useLaceSelector('wallets.selectAll');
  const isHardwareWalletSession = (() => {
    if (!request) return false;
    const accountId = sessionAccountByOrigin[request.dappOrigin];
    if (!accountId) return false;
    const wallet = allWallets.find(w =>
      w.accounts.some(a => a.accountId === accountId),
    );
    return wallet ? isHardwareWallet(wallet) : false;
  })();

  const [isHwSigning, setIsHwSigning] = useState(false);
  useEffect(() => {
    if (isComplete || isError) setIsHwSigning(false);
  }, [isComplete, isError]);

  const handleConfirmWithHwIndicator = useCallback(() => {
    if (isHardwareWalletSession) setIsHwSigning(true);
    handleConfirm();
  }, [handleConfirm, isHardwareWalletSession]);

  const resultState = isComplete
    ? 'success'
    : isError
    ? 'failure'
    : isHwSigning
    ? 'signing'
    : null;
  const resultView = resultState ? (
    <SignDataResult
      state={resultState}
      onClose={closeDappView}
      titleKey={resultState === 'failure' ? hwErrorKeys?.title : undefined}
      descriptionKey={
        resultState === 'failure' ? hwErrorKeys?.subtitle : undefined
      }
    />
  ) : null;

  const contentProps = useMemo((): SignDataContentProps | null => {
    if (request === null) {
      return null;
    }
    const { dapp, address, payload } = request;
    return {
      dapp: {
        icon: dapp.imageUrl
          ? {
              img: { uri: dapp.imageUrl },
              fallback: dapp.name,
            }
          : { fallback: dapp.name },
        name: dapp.name,
        origin: dapp.origin,
      },
      accountInfo,
      address,
      payload,
      dRepKeyHash,
    };
  }, [request, accountInfo, dRepKeyHash]);

  const isShowingLoading = isLoading && !isComplete && !isError;

  return (
    <SignDataLayout
      resultView={resultView}
      showLoading={isShowingLoading}
      contentProps={contentProps}
      onConfirm={handleConfirmWithHwIndicator}
      onReject={handleReject}
      loadingStyle={styles.loadingContainer}
    />
  );
};
