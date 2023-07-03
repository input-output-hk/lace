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
import { NftItem } from '../elements/NFTs/nftItem';
import localStorageInitializer from '../fixture/localStorageInitializer';

When(/^I click on NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await nftsPageObject.clickNftItem(nftName);
});

Given(
  /^the NFT with name: "([^"]*)" is (removed from|displayed in) gallery$/,
  async (nftName: string, shouldBeDisplayed: string) => {
    await nftAssert.assertNftDisplayed(nftName, shouldBeDisplayed === 'displayed in');
  }
);

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

When(/^I see NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await nftAssert.assertNftDisplayed(nftName, true);
});

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
  await $(new NftItem().container().toJSLocator()).waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertSeeNftList(1);
});

Then(/^Verify that "([^"]*)" (contains|doesn't contain) fallback image$/, async (nftName: string, contains: string) => {
  await $(new NftItem().container().toJSLocator()).waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertNftFallbackImage(nftName, contains === 'contains');
});

Then(/^each NFT has name and image displayed$/, async () => {
  await $(new NftItem().container().toJSLocator()).waitForDisplayed({ timeout: 15_000 });
  await nftAssert.assertSeeEachNftItem();
});

When(/^I open NFT receiving wallet$/, async () => {
  const walletToLoad = await nftsPageObject.getNonActiveNftWalletName();
  await localStorageInitializer.reInitializeWallet(walletToLoad);
});
