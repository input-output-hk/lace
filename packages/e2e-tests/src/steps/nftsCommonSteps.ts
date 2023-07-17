import { When } from '@wdio/cucumber-framework';
import nftsPageObject from '../pageobject/nftsPageObject';
import { Given, Then } from '@cucumber/cucumber';
import nftAssert from '../assert/nftAssert';
import { Asset } from '../data/Asset';
import transactionsPageAssert from '../assert/transactionsPageAssert';
import { t } from '../utils/translationService';
import testContext from '../utils/testContext';
import { getTestWallet } from '../support/walletConfiguration';
import transactionDetailsAssert from '../assert/transactionDetailsAssert';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import topNavigationAssert from '../assert/topNavigationAssert';
import localStorageInitializer from '../fixture/localStorageInitializer';
import NftsPage from '../elements/NFTs/nftsPage';

When(/^I click on NFT with name: "([^"]*)" on NFTs page$/, async (nftName: string) => {
  await nftsPageObject.clickNftItemOnNftsPage(nftName);
});

When(/^I click on NFT with name: "([^"]*)" in asset selector$/, async (nftName: string) => {
  await nftsPageObject.clickNftItemInAssetSelector(nftName);
});

Then(
  /^the (Received|Sent) transaction is displayed with NFT name: "([^"]*)" in (extended|popup) mode$/,
  async (transactionType: 'Received' | 'Sent', nftName: string, mode: 'extended' | 'popup') => {
    await browser.pause(2000);
    const expectedTransactionRowAssetDetailsSent = {
      type: transactionType,
      tokensAmount:
        mode === 'extended' ? `1.17 ${Asset.CARDANO.ticker}, 1 ${nftName}` : `1.17 ${Asset.CARDANO.ticker} , +1`,
      tokensCount: 2
    };
    await transactionsPageAssert.assertSeeTransactionRowWithAssetDetails(1, expectedTransactionRowAssetDetailsSent);
  }
);

When(/^I see NFTs counter with total number of NFTs displayed$/, async () => {
  await nftAssert.assertSeeTitleWithCounter();
});

Then(/^NFTs counter matches the number of wallet NFTs$/, async () => {
  await nftAssert.assertCounterNumberMatchesWalletNFTs();
});

When(
  /^I (see|do not see) NFT with name: "([^"]*)" on the NFTs page$/,
  async (shouldBeDisplayed: 'see' | 'do not see', nftName: string) => {
    await nftAssert.assertNftDisplayedOnNftsPage(nftName, shouldBeDisplayed === 'see');
  }
);

Then(
  /^The Tx details are displayed as (sent|received) for NFT with name: "([^"]*)" and wallet: "([^"]*)" address$/,
  async (type: string, nftName: string, walletName: string) => {
    const typeTranslationKey =
      type === 'sent' ? 'package.core.transactionDetailBrowser.sent' : 'package.core.transactionDetailBrowser.received';

    const expectedTransactionDetails = {
      transactionDescription: `${await t(typeTranslationKey)}\n(2)`,
      hash: String(testContext.load('txHashValue')),
      sentAssets: [`1 ${nftName}`],
      sentAda: `1.16 ${Asset.CARDANO.ticker}`,
      recipientAddress: getTestWallet(walletName).address,
      status: 'Success'
    };
    await transactionDetailsAssert.assertSeeTransactionDetails(expectedTransactionDetails);
  }
);

Given(
  /^I'm in (popup|extended) mode and select wallet that has NFT: "([^"]*)"$/,
  async (mode: 'extended' | 'popup', nftName: string) => {
    const isNftDisplayed = await nftsPageObject.isNftDisplayed(nftName);
    if (!isNftDisplayed) {
      const walletToLoad = await nftsPageObject.getNonActiveNftWalletName();
      await localStorageInitializer.reInitializeWallet(walletToLoad);
      await mainMenuPageObject.navigateToSection('NFTs', mode);
      await topNavigationAssert.assertWalletIsInSyncedStatus();
    }
  }
);

Then(/^A gallery view showing my NFTs is displayed$/, async () => {
  await NftsPage.nftContainer.waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertSeeNftList(1);
});

Then(/^Verify that "([^"]*)" (contains|doesn't contain) fallback image$/, async (nftName: string, contains: string) => {
  await NftsPage.nftContainer.waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertNftFallbackImage(nftName, contains === 'contains');
});

Then(/^each NFT has name and image displayed$/, async () => {
  await NftsPage.nftContainer.waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertSeeEachNftItemOnNftsPage();
});

When(/^I open NFT receiving wallet$/, async () => {
  const walletToLoad = await nftsPageObject.getNonActiveNftWalletName();
  await localStorageInitializer.reInitializeWallet(walletToLoad);
});

When(/^I save all NFTs that I have$/, async () => {
  await nftsPageObject.saveNfts();
});
