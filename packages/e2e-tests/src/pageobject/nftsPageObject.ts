import webTester from '../actor/webTester';
import { NftItem } from '../elements/NFTs/nftItem';
import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import nftAssert from '../assert/nftAssert';
import newTransactionExtendedPageObject from './newTransactionExtendedPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import { NftDetails } from '../elements/NFTs/nftDetails';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { TransactionSummaryPage } from '../elements/newTransaction/transactionSummaryPage';

class NftsPageObject {
  async clickNftItem(nftName: string) {
    const nftItem = new NftItem(nftName);
    await webTester.clickElement(nftItem.name());
  }

  async progressWithSendUntilPasswordPage(nftName: string): Promise<any> {
    await this.clickNftItem(nftName);
    await webTester.waitUntilSeeElementContainingText(nftName);
    await nftAssert.assertSeeNftDetails();
    await new NftDetails().sendNFTButton.waitForClickable();
    await new NftDetails().sendNFTButton.click();
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
    const nftItem = await $(new NftItem(nftName).toJSLocator());
    return await nftItem.isDisplayed();
  }

  async getNonActiveNftWalletName(): Promise<string> {
    return testContext.load('activeWallet') === TestWalletName.WalletReceiveNftE2E
      ? TestWalletName.WalletSendNftE2E
      : TestWalletName.WalletReceiveNftE2E;
  }
}

export default new NftsPageObject();
