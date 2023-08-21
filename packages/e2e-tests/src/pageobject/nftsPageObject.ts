/* eslint-disable no-undef */

import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import newTransactionExtendedPageObject from './newTransactionExtendedPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import NftDetails from '../elements/NFTs/nftDetails';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { TransactionSummaryPage } from '../elements/newTransaction/transactionSummaryPage';
import NftsPage from '../elements/NFTs/nftsPage';
import { TokenSelectionPage } from '../elements/newTransaction/tokenSelectionPage';

class NftsPageObject {
  async clickNftItemOnNftsPage(nftName: string, clickType: 'left' | 'right' = 'left') {
    const nftNameElement = await NftsPage.getNftName(nftName);
    await nftNameElement.click({ button: clickType });
  }

  async clickNftItemInAssetSelector(nftName: string) {
    const tokenSelectionPage = new TokenSelectionPage();
    const nftNameElement = await tokenSelectionPage.getNftName(nftName);
    await nftNameElement.click();
  }

  async progressWithSendUntilPasswordPage(nftName: string, hdWallet = false): Promise<any> {
    await this.clickNftItemOnNftsPage(nftName);
    await NftDetails.sendNFTButton.waitForClickable();
    await NftDetails.sendNFTButton.click();
    const receiverWallet = hdWallet
      ? getTestWallet(await this.getNonActiveNftHdWalletName())
      : getTestWallet(await this.getNonActiveNftWalletName());
    const receiverAddress = extensionUtils.isMainnet()
      ? String(receiverWallet.mainnetAddress)
      : String(receiverWallet.address);
    await newTransactionExtendedPageObject.fillAddress(receiverAddress);
    await simpleTxSideDrawerPageObject.fillTokenValue('1');
    await new TransactionNewPage().reviewTransactionButton.waitForClickable({ timeout: 15_000 });
    await new TransactionNewPage().reviewTransactionButton.click();
    await new TransactionSummaryPage().confirmButton.waitForClickable();
    await new TransactionSummaryPage().confirmButton.click();
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
