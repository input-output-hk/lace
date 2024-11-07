import { When } from '@wdio/cucumber-framework';
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
import { expect } from 'chai';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import nftDetails from '../elements/NFTs/nftDetails';
import {
  getNonActiveAdaHandle2WalletName,
  getNonActiveAdaHandleWalletName,
  getNonActiveNft2WalletName,
  getNonActiveNftHdWalletName,
  getNonActiveNftWalletName
} from '../utils/walletUtils';

When(
  /^I (left|right) click on the NFT with name "([^"]*)" on NFTs page$/,
  async (clickType: 'left' | 'right' | '', nftName: string) => {
    await NftsPage.clickNftItem(nftName, clickType === '' ? 'left' : clickType);
  }
);

When(/^I click on NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await TokenSelectionPage.clickNftItemInAssetSelector(nftName);
});

Then(
  /^the (Received|Sent) transaction is displayed with (NFT|handle) name: "([^"]*)" in (extended|popup) mode$/,
  async (
    transactionType: 'Received' | 'Sent',
    typeOfAsset: 'NFT' | 'handle',
    name: string,
    mode: 'extended' | 'popup'
  ) => {
    const fee = typeOfAsset === 'NFT' ? '1.17' : '1.19';
    const expectedTransactionRowAssetDetailsSent = {
      type: transactionType,
      tokensAmount:
        mode === 'extended' ? `${fee} ${Asset.CARDANO.ticker}, 1 ${name}` : `${fee} ${Asset.CARDANO.ticker} , +1`,
      tokensCount: 2
    };
    await transactionsPageAssert.assertSeeTransactionRowWithAssetDetails(0, expectedTransactionRowAssetDetailsSent);
  }
);

When(/^I see NFTs counter with total number of NFTs displayed$/, async () => {
  await nftAssert.assertSeeTitleWithCounter();
});

Then(/^NFTs counter matches the number of wallet NFTs$/, async () => {
  await nftAssert.assertCounterNumberMatchesWalletNFTs();
});

When(/^I search for NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await NftsPage.nftSearchInput.setValue(nftName);
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
    const typeTranslationKey = type === 'sent' ? 'core.activityDetails.sent' : 'core.activityDetails.received';

    const expectedActivityDetails = {
      transactionDescription: `${await t(typeTranslationKey)}\n(2)`,
      hash: String(testContext.load('txHashValue')),
      sentAssets: [`1 ${nftName}`],
      sentAda: `1.16 ${Asset.CARDANO.ticker}`,
      recipientAddress: getTestWallet(walletName).accounts[0].address,
      status: 'Success'
    };
    await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
  }
);

Given(
  /^I use a (single|HD) wallet with "([^"]*)" NFT in (popup|extended) mode$/,
  async (walletType: 'single' | 'HD', nftName: string, mode: 'extended' | 'popup') => {
    const isNftDisplayed = await NftsPage.isNftDisplayed(nftName);
    if (!isNftDisplayed) {
      let walletToLoad;
      if (walletType === 'HD') {
        walletToLoad = getNonActiveNftHdWalletName();
      } else {
        walletToLoad = mode === 'extended' ? getNonActiveNftWalletName() : getNonActiveNft2WalletName();
      }
      await localStorageInitializer.reInitializeWallet(walletToLoad);
      await topNavigationAssert.assertWalletIsInSyncedStatus();
      await mainMenuPageObject.navigateToSection('NFTs', mode);
      expect(await NftsPage.isNftDisplayed(nftName)).to.be.true;
    }
  }
);

Given(
  /^I use a wallet with ADA handle "([^"]*)" NFT in (popup|extended) mode$/,
  async (adahandle: string, mode: 'extended' | 'popup') => {
    const isAdaHandle = await NftsPage.isNftDisplayed(adahandle);
    if (!isAdaHandle) {
      const walletToLoad = mode === 'extended' ? getNonActiveAdaHandleWalletName() : getNonActiveAdaHandle2WalletName();
      await localStorageInitializer.reInitializeWallet(walletToLoad);
      await topNavigationAssert.assertWalletIsInSyncedStatus();
      await mainMenuPageObject.navigateToSection('NFTs', mode);
      expect(await NftsPage.isNftDisplayed(adahandle)).to.be.true;
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

When(/^I open NFT receiving wallet in (popup|extended) mode$/, async (mode: 'extended' | 'popup') => {
  const walletToLoad = mode === 'extended' ? getNonActiveNftWalletName() : getNonActiveNft2WalletName();
  await localStorageInitializer.reInitializeWallet(walletToLoad);
});

When(/^I open NFT receiving HD wallet$/, async () => {
  const walletToLoad = getNonActiveNftHdWalletName();
  await localStorageInitializer.reInitializeWallet(walletToLoad);
});

When(/^I save all NFTs that I have$/, async () => {
  await NftsPage.saveNfts();
});

When(/^I save NFT details$/, async () => {
  await nftDetails.saveNFTDetails();
});
