import React from 'react';
import { StyleSheet } from 'react-native';

import { SignDataLayout, SignDataResult } from '../../../common/components';

import { useSignData } from './useSignData';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
});

export const SignData = (props: SheetScreenProps<SheetRoutes.SignData>) => {
  const {
    dapp: displayDapp,
    address,
    payload,
    handleConfirm,
    handleReject,
    handleCloseResult,
    signDataResult,
    isLoading,
    accountInfo,
  } = useSignData(props);

  const resultView = signDataResult ? (
    <SignDataResult state={signDataResult.state} onClose={handleCloseResult} />
  ) : null;

  const contentProps = displayDapp
    ? { dapp: displayDapp, accountInfo, address, payload }
    : null;

  return (
    <SignDataLayout
      resultView={resultView}
      showLoading={isLoading || !displayDapp}
      contentProps={contentProps}
      onConfirm={handleConfirm}
      onReject={handleReject}
      loadingStyle={styles.loadingContainer}
    />
  );
};
