import { When, Then } from '@cucumber/cucumber';
import transactionExtendedPageObject from '../pageobject/newTransactionExtendedPageObject';
import transactionBundlesAssert from '../assert/transaction/transactionBundleAssert';
import transactionSummaryAssert from '../assert/transaction/transactionSummaryAssert';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import { Asset } from '../data/Asset';
import transactionAssetSelectionAssert from '../assert/transaction/transactionAssetSelectionAssert';
import extensionUtils from '../utils/utils';
import { shelley, byron } from '../data/AddressData';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import simpleTxSideDrawerPageObject from '../pageobject/simpleTxSideDrawerPageObject';

Then(/^I see (\d) bundle rows$/, async (expectedNumberOfBundles: number) => {
  await transactionBundlesAssert.assertSeeBundles(expectedNumberOfBundles);
});

When(/^I remove output (\d) for advanced tx$/, async (index: number) => {
  await transactionExtendedPageObject.clickRemoveBundleButton(index);
});

When(/^I set multiple outputs for advanced transaction$/, async () => {
  await transactionExtendedPageObject.fillAddress(shelley.getAddress(), 1);
  await transactionExtendedPageObject.fillTokenValue(1, Asset.CARDANO.name);
  await new TransactionNewPage().addBundleButton.click();
  await transactionExtendedPageObject.fillAddress(shelley.getAddress(), 2);
  await transactionExtendedPageObject.fillTokenValue(2, Asset.CARDANO.name, 2);
});

When(/^I set multiple outputs for advanced transaction with less than minimum value for Byron address$/, async () => {
  await transactionExtendedPageObject.fillAddress(byron.getAddress(), 1);
  await transactionExtendedPageObject.fillTokenValue(1, Asset.CARDANO.ticker);
  await new TransactionNewPage().addBundleButton.click();
  await transactionExtendedPageObject.fillAddress(byron.getAddress(), 2);
  await transactionExtendedPageObject.fillTokenValue(2, Asset.CARDANO.ticker, 2);
});

Then(/^The Tx summary screen for 2 bundles is displayed for Byron with minimum value$/, async () => {
  const bundle1 = {
    recipientAddress: byron.getAddress(),
    valueToBeSent: [{ value: '1.08', currency: Asset.CARDANO.ticker }]
  };
  const bundle2 = {
    recipientAddress: byron.getAddress(),
    valueToBeSent: [{ value: '2.00', currency: Asset.CARDANO.ticker }]
  };
  await transactionSummaryAssert.assertSeeSummaryPage([bundle1, bundle2]);
});

Then(/^The Tx summary screen is displayed for 2 bundles with multiple assets$/, async () => {
  const bundle1 = {
    recipientAddress: byron.getAddress(),
    valueToBeSent: [
      { value: '2.00', currency: Asset.CARDANO.ticker, shouldVerifyFiat: true },
      {
        value: '1',
        currency: extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker,
        shouldVerifyFiat: false
      }
    ]
  };
  const bundle2 = {
    recipientAddress: shelley.getAddress(),
    valueToBeSent: [
      { value: '1.23', currency: Asset.CARDANO.ticker, shouldVerifyFiat: true },
      { value: '1', currency: Asset.IBILECOIN.name, shouldVerifyFiat: false },
      { value: '1', currency: Asset.BISON_COIN.name, shouldVerifyFiat: false }
    ]
  };
  await transactionSummaryAssert.assertSeeSummaryPage([bundle1, bundle2]);
});

Then(/^The Tx summary screen is displayed for 1 bundle with multiple assets$/, async () => {
  const bundle1 = {
    recipientAddress: byron.getAddress(),
    valueToBeSent: [
      { value: extensionUtils.isMainnet() ? '1.39' : '1.41', currency: Asset.CARDANO.ticker, shouldVerifyFiat: true },
      {
        value: '2',
        currency: extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker,
        shouldVerifyFiat: false
      },
      { value: '1', currency: Asset.IBILECOIN.name, shouldVerifyFiat: false },
      { value: '1', currency: Asset.BISON_COIN.name, shouldVerifyFiat: false }
    ]
  };
  await transactionSummaryAssert.assertSeeSummaryPage([bundle1]);
});

Then(/^I set 2 bundles with multiple assets$/, async () => {
  await transactionExtendedPageObject.setTwoBundlesWithMultipleAssets();
});

Then(/^I set 2 bundles with the same assets$/, async () => {
  await transactionExtendedPageObject.setTwoBundlesWithTheSameAssets();
});

Then(/^I set 1 bundle with multiple assets$/, async () => {
  await transactionExtendedPageObject.setOneBundleWithMultipleAssets();
});

Then(/^An Incorrect address (\d*) error is displayed$/, async (inputIndex: number) => {
  await transactionBundlesAssert.assertInvalidAddressErrorIsDisplayed(inputIndex);
});

Then(/^I click "Add token or NFT" button for bundle (\d*)$/, async (inputIndex: number) => {
  await transactionExtendedPageObject.clickAddAssetButtonMulti(inputIndex);
});

Then(
  /^transaction fee is around ([^"]*) ADA and Ada allocation cost is around ([^"]*) ADA$/,
  async (expectedValueAda: string, expectedValueAdaAllocation: string) => {
    await drawerSendExtendedAssert.assertSeeTransactionCosts(expectedValueAda);
    await drawerSendExtendedAssert.assertSeeAdaAllocationCosts(expectedValueAdaAllocation);
  }
);

Then(/^bundle (\d+) contains following assets:$/, async (bundleIndex, assets) => {
  for (const asset of assets.hashes()) {
    await transactionBundlesAssert.assertSeeAssetNameAndValueInBundle(asset.name, asset.amount, bundleIndex);
  }
});

Then(
  /^I (see|do not see) insufficient balance error in bundle (\d) for "([^"]*)" asset$/,
  async (state: 'see' | 'do not see', bundleIndex: number, assetName: string) => {
    await drawerSendExtendedAssert.assertInsufficientBalanceErrorInBundle(bundleIndex, assetName, state === 'see');
  }
);

Then(
  /^the asset "([^"]*)" (is|is not) displayed in the token list$/,
  async (assetName: string, shouldBeDisplayed: 'is' | 'is not') => {
    await transactionAssetSelectionAssert.assertAssetIsPresentInTokenList(assetName, shouldBeDisplayed === 'is');
  }
);

Then(/^I click "Close" button on send success drawer$/, async () => {
  await simpleTxSideDrawerPageObject.clickCloseAllDoneDrawerButton();
});
