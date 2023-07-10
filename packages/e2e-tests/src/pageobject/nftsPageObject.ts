/* eslint-disable no-undef */

import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import newTransactionExtendedPageObject from './newTransactionExtendedPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import NftDetails from '../elements/NFTs/nftDetails';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { TransactionSummaryPage } from '../elements/newTransaction/transactionSummaryPage';
import NftItem from '../elements/NFTs/nftItem';

class NftsPageObject {
  async clickNftItem(nftName: string) {
    const nftNameElement = await NftItem.getNftNameByName(nftName);
    await nftNameElement.click();
  }

  async progressWithSendUntilPasswordPage(nftName: string): Promise<any> {
    await this.clickNftItem(nftName);
    await NftDetails.sendNFTButton.waitForClickable();
    await NftDetails.sendNFTButton.click();
    const receiverWallet = getTestWallet(await this.getNonActiveNftWalletName());
    const receiverAddress = extensionUtils.isMainnet() ? receiverWallet.mainnetAddress : receiverWallet.address;
    await newTransactionExtendedPageObject.fillAddress(receiverAddress);
    await simpleTxSideDrawerPageObject.fillTokenValue('1');
    await new TransactionNewPage().reviewTransactionButton.waitForClickable({ timeout: 15_000 });
    await new TransactionNewPage().reviewTransactionButton.click();
    await new TransactionSummaryPage().confirmButton.waitForClickable();
    await new TransactionSummaryPage().confirmButton.click();
  }

  async isNftDisplayed(nftName: string): Promise<boolean> {
    const nftItem = await NftItem.getNftByName(nftName);
    return nftItem !== undefined;
  }

  async getNonActiveNftWalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveNftE2E
      ? TestWalletName.WalletSendNftE2E
      : TestWalletName.WalletReceiveNftE2E;
  }

  async saveNfts(): Promise<any> {
    const names: string[] = [];

    for (const nftContainer of await NftItem.containers) {
      names.push(await nftContainer.getText());
    }
    testContext.save('ownedNfts', names);
  }
}

export default new NftsPageObject();
