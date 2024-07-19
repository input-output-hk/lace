import testContext from './testContext';
import { TestWalletName } from '../support/walletConfiguration';

export const getNonActiveNftWalletName = (): string =>
  testContext.load('activeWallet') === TestWalletName.WalletReceiveNftE2E
    ? TestWalletName.WalletSendNftE2E
    : TestWalletName.WalletReceiveNftE2E;

export const getNonActiveNft2WalletName = (): string =>
  testContext.load('activeWallet') === TestWalletName.WalletReceiveNft2E2E
    ? TestWalletName.WalletSendNft2E2E
    : TestWalletName.WalletReceiveNft2E2E;

export const getNonActiveAdaHandleWalletName = (): string =>
  testContext.load('activeWallet') === TestWalletName.WalletReceiveAdaHandleE2E
    ? TestWalletName.WalletSendAdaHandleE2E
    : TestWalletName.WalletReceiveAdaHandleE2E;

export const getNonActiveAdaHandle2WalletName = (): string =>
  testContext.load('activeWallet') === TestWalletName.WalletReceiveAdaHandle2E2E
    ? TestWalletName.WalletSendAdaHandle2E2E
    : TestWalletName.WalletReceiveAdaHandle2E2E;

export const getNonActiveNftHdWalletName = (): string =>
  testContext.load('activeWallet') === TestWalletName.WalletReceiveNftHdWalletE2E
    ? TestWalletName.WalletSendNftHdWalletE2E
    : TestWalletName.WalletReceiveNftHdWalletE2E;
