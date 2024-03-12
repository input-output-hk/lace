/* eslint-disable no-undef */

import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import NftDetails from '../elements/NFTs/nftDetails';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import TransactionSummaryPage from '../elements/newTransaction/transactionSummaryPage';
import NftsPage from '../elements/NFTs/nftsPage';
import { AddressInput } from '../elements/AddressInput';

class NftsPageObject {
  async clickNftItemOnNftsPage(nftName: string, clickType: 'left' | 'right' = 'left') {
    const nftNameElement = await NftsPage.getNftName(nftName);
    await nftNameElement.waitForStable();
    await nftNameElement.click({ button: clickType });
  }

  async progressWithSendUntilPasswordPage(
    nftName: string,
    mode: string,
    hdWallet = false,
    adaHandle = false
  ): Promise<any> {
    await this.clickNftItemOnNftsPage(nftName);
    await NftDetails.sendNFTButton.waitForClickable();
    await NftDetails.sendNFTButton.click();
    let receiverWallet;
    if (hdWallet) {
      receiverWallet = getTestWallet(await this.getNonActiveNftHdWalletName());
    } else if (adaHandle) {
      receiverWallet =
        mode === 'extended'
          ? getTestWallet(await this.getNonActiveAdaHandleWalletName())
          : getTestWallet(await this.getNonActiveAdaHandle2WalletName());
    } else {
      receiverWallet =
        mode === 'extended'
          ? getTestWallet(await this.getNonActiveNftWalletName())
          : getTestWallet(await this.getNonActiveNft2WalletName());
    }
    const receiverAddress = extensionUtils.isMainnet()
      ? String(receiverWallet.mainnetAddress)
      : String(receiverWallet.address);
    await new AddressInput().fillAddress(receiverAddress);
    await simpleTxSideDrawerPageObject.fillTokenValue('1');
    await TransactionNewPage.reviewTransactionButton.waitForClickable({ timeout: 15_000 });
    await TransactionNewPage.reviewTransactionButton.click();
    await TransactionSummaryPage.confirmButton.waitForClickable();
    await TransactionSummaryPage.confirmButton.click();
  }

  async isNftDisplayed(nftName: string): Promise<boolean> {
    await NftsPage.nftContainer.waitForDisplayed({ timeout: 15_000 });
    const nftItem = await NftsPage.getNftContainer(nftName);
    return nftItem !== undefined;
  }

  async getNonActiveNftWalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveNftE2E
      ? TestWalletName.WalletSendNftE2E
      : TestWalletName.WalletReceiveNftE2E;
  }

  async getNonActiveNft2WalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveNft2E2E
      ? TestWalletName.WalletSendNft2E2E
      : TestWalletName.WalletReceiveNft2E2E;
  }

  async getNonActiveAdaHandleWalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveAdaHandleE2E
      ? TestWalletName.WalletSendAdaHandleE2E
      : TestWalletName.WalletReceiveAdaHandleE2E;
  }

  async getNonActiveAdaHandle2WalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveAdaHandle2E2E
      ? TestWalletName.WalletSendAdaHandle2E2E
      : TestWalletName.WalletReceiveAdaHandle2E2E;
  }

  async getNonActiveNftHdWalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveNftHdWalletE2E
      ? TestWalletName.WalletSendNftHdWalletE2E
      : TestWalletName.WalletReceiveNftHdWalletE2E;
  }

  async saveNfts(): Promise<any> {
    const names: string[] = [];

    for (const nftContainer of await NftsPage.nftContainers) {
      names.push(await nftContainer.getText());
    }
    testContext.save('ownedNfts', names);
  }
}

export default new NftsPageObject();
