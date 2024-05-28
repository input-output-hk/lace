/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import {
  byron,
  icarus,
  shelley,
  shelleyInvalid,
  validAddress,
  validAddress2,
  validAddress3,
  validAddress4,
  validAddress5,
  validAddress6
} from '../data/AddressData';
import coinConfigureAssert from '../assert/coinConfigureAssert';
import transactionSummaryAssert from '../assert/transaction/transactionSummaryAssert';
import transactionPasswordExtendedAssert from '../assert/transaction/transactionPasswordExtendedAssert';
import transactionSubmittedAssert from '../assert/transaction/transactionSubmittedAssert';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import indexedDB from '../fixture/indexedDB';
import transactionBundleAssert from '../assert/transaction/transactionBundleAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import testContext from '../utils/testContext';
import transactionDetailsAssert, {
  AddressTag,
  ExpectedActivityDetails,
  TransactionData
} from '../assert/transactionDetailsAssert';
import { t } from '../utils/translationService';
import { Asset } from '../data/Asset';
import extensionUtils from '../utils/utils';
import Modal from '../elements/modal';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import TransactionSummaryPage from '../elements/newTransaction/transactionSummaryPage';
import TransactionAssetSelectionAssert from '../assert/transaction/transactionAssetSelectionAssert';
import TransactionSubmittedPage from '../elements/newTransaction/transactionSubmittedPage';
import { browser } from '@wdio/globals';
import AddNewAddressDrawer from '../elements/addressbook/AddNewAddressDrawer';
import { AddressInput } from '../elements/AddressInput';
import { AssetInput } from '../elements/newTransaction/assetInput';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import TransactionPasswordPage from '../elements/newTransaction/transactionPasswordPage';
import { Key } from 'webdriverio';
import { parseWalletAddress } from '../utils/parseWalletAddress';
import { AddressType } from '../enums/AddressTypeEnum';

Given(/I have several contacts whose start with the same characters/, async () => {
  await indexedDB.clearAddressBook();
  await indexedDB.insertAddress(validAddress);
  await indexedDB.insertAddress(validAddress2);
  await indexedDB.insertAddress(validAddress3);
  await indexedDB.insertAddress(validAddress4);
  await indexedDB.insertAddress(validAddress5);
  await indexedDB.insertAddress(validAddress6);
  await browser.pause(500);
});

Given(/all fields are empty/, async () => {
  await drawerSendExtendedAssert.assertDefaultInputsDoNotContainValues();
});

When(
  /I enter a valid "([^"]*)" address in the bundle (\d+) recipient's address/,
  async (address: string, inputIndex: number) => {
    let addr;
    switch (address) {
      case 'shelley':
        addr = shelley.getAddress();
        break;
      case 'byron':
        addr = byron.getAddress();
        break;
      case 'icarus':
        addr = icarus.getAddress();
        break;
      case 'mainnetShelley':
        addr = shelley.getMainnetAddress();
        break;
      case 'testnetShelley':
        addr = shelley.getTestnetAddress();
        break;
      case 'mainnetByron':
        addr = byron.getMainnetAddress();
        break;
      case 'testnetByron':
        addr = byron.getTestnetAddress();
        break;
      case 'mainnetIcarus':
        addr = icarus.getMainnetAddress();
        break;
      case 'testnetIcarus':
        addr = icarus.getTestnetAddress();
        break;
      default:
        addr = address;
        break;
    }
    await new AddressInput(inputIndex).fillAddress(addr);
  }
);

When(/I enter "([^"]*)" in the bundle (\d+) recipient's address/, async (value: string, inputIndex: number) => {
  await new AddressInput(inputIndex).fillAddress(value);
});

When(/I enter the first characters of the contacts/, async () => {
  await new AddressInput().fillAddressWithFirstChars(validAddress2.getName(), 3);
});

When(/click on one of the contacts on the dropdown/, async () => {
  await browser.pause(500);
  await TransactionNewPage.clickAddressBookSearchResult(1);
});

When(
  /^click on the remove button for the "([^"]*)" asset in bundle (\d)$/,
  async (assetName: string, bundleIndex: number) => {
    await TransactionNewPage.coinConfigure(bundleIndex, assetName).clickRemoveAssetButton();
  }
);

When(/^I enter "([^"]*)" in asset search input$/, async (assetName: string) => {
  await TokenSelectionPage.searchAsset(assetName);
});

Then(
  /^the "([^"]*)" asset does not contain remove button in bundle (\d)$/,
  async (assetName: string, bundleIndex: number) => {
    await transactionBundleAssert.assertDeleteButtonForAssetNotPresentInBundle(assetName, bundleIndex);
  }
);

Then(/^the "([^"]*)" asset is not displayed in bundle (\d)$/, async (assetName: string, bundleIndex: number) => {
  await transactionBundleAssert.assertTokenNameNotPresentInBundleAndCoinConfigure(assetName, bundleIndex);
});

When(/^I click MAX button in bundle (\d) for "([^"]*)" asset$/, async (bundleIndex: number, assetName: string) => {
  assetName = assetName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : assetName;
  await TransactionNewPage.coinConfigure(bundleIndex, assetName).clickMaxButton();
});

When(/^I select amount: (\d*) of asset type: (Tokens|NFTs)$/, async (amount: number, assetType: 'Tokens' | 'NFTs') => {
  await TokenSelectionPage.addAmountOfAssets(amount, assetType);
});

When(/^I deselect (Tokens|NFTs) (\d*)$/, async (assetType: 'Tokens' | 'NFTs', index: number) => {
  await TokenSelectionPage.deselectToken(assetType, index);
});

When(/^I save selected (Tokens|NFTs) in bundle (\d*)$/, async (assetType: 'Tokens' | 'NFTs', bundle: number) => {
  await TokenSelectionPage.saveSelectedTokens(assetType, bundle);
});

Then(
  /^the maximum available amount is displayed in bundle: (\d) for "([^"]*)" asset$/,
  async (bundleIndex, assetName) => {
    await transactionBundleAssert.assertSetMaxAmountInBundleAndCoinConfigure(bundleIndex, assetName);
  }
);

Then(
  /I enter an address that matches the amount of characters but does not match with the checksum into address input (\d+)/,
  async (inputIndex: number) => {
    await new AddressInput(inputIndex).fillAddress(shelleyInvalid.getAddress());
  }
);

Then(/I enter more or less characters than the required for an address in the bundle recipient's address/, async () => {
  const addressInput = new AddressInput();
  await addressInput.fillAddress(shelley.getAddress());
  await addressInput.addToAddress('a');
});

Then(
  /click on the coin selector for "([^"]*)" asset in bundle (\d)/,
  async (assetName: string, bundleIndex: number) => {
    assetName = assetName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : assetName;
    await TransactionNewPage.coinConfigure(bundleIndex, assetName).clickCoinSelectorName();
  }
);

Then(/^coin selector contains two tabs: tokens & nfts$/, async () => {
  await TransactionAssetSelectionAssert.assertSeeTokenSelectionPageButtons();
});

Then(/^click on the (Tokens|NFTs) button in the coin selector dropdown$/, async (button: string) => {
  button === 'Tokens' ? await TokenSelectionPage.clickTokensButton() : await TokenSelectionPage.clickNFTsButton();
});

Then(/click on an token with name: "([^"]*)"/, async (tokenName: string) => {
  await TokenSelectionPage.clickOnToken(tokenName);
});

Then(
  /^Token with name: "([^"]*)" (is displayed|is not displayed) in coin selector$/,
  async (tokenName: string, state: string) => {
    await TransactionAssetSelectionAssert.assertAssetIsPresentInTokenList(tokenName, state === 'is displayed');
  }
);

Then(/^the "([^"]*)" asset is displayed in bundle (\d)$/, async (tokenName: string, bundleIndex: number) => {
  tokenName = tokenName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : tokenName;
  await transactionBundleAssert.assertSeeTokenNameInBundleAndCoinConfigure(tokenName, bundleIndex);
});

Then(/^the balance of token is displayed in coin selector$/, async () => {
  await coinConfigureAssert.assertSeeNonEmptyBalanceInCoinConfigure();
});

Then(
  /^click "(Add|Remove) address" button inside address input (\d+)$/,
  async (_ignored: string, inputIndex: number) => {
    const addressInput = new AddressInput(inputIndex);
    await addressInput.searchLoader.waitForClickable({ reverse: true });
    await addressInput.clickAddAddressButton();
  }
);

When(
  /^I fill bundle (\d+) with "([^"]*)" (main|copied|other multiaddress|second account) address with following assets:$/,
  async (bundleIndex, walletName, addressType: AddressType, options) => {
    const addressInput = new AddressInput(bundleIndex);
    await addressInput.fillAddress(await parseWalletAddress(walletName, addressType));
    await addressInput.searchLoader.waitForDisplayed({ reverse: true });
    // Close address dropdown menu if exists
    if (await TransactionNewPage.addressBookSearchResultRow(1).isExisting()) {
      await TransactionNewPage.clickDrawerBackground();
    }
    for (const entry of options.hashes()) {
      switch (entry.type) {
        case 'ADA':
          break;
        case 'NFT':
          await new AssetInput(bundleIndex).clickAddAssetButton();
          await TokenSelectionPage.clickNFTsButton();
          await TokenSelectionPage.clickNftItemInAssetSelector(entry.assetName);
          break;
        case 'Token':
          await new AssetInput(bundleIndex).clickAddAssetButton();
          await TokenSelectionPage.clickOnToken(entry.assetName);
          break;
      }
      await TransactionNewPage.coinConfigure(bundleIndex, entry.ticker ? entry.ticker : entry.assetName).fillTokenValue(
        Number.parseFloat(entry.amount)
      );
    }
  }
);

When(
  /^I save ticker for the (Token|NFT) with name: ([^"]*)$/,
  async (assetType: 'Token' | 'NFT', assetName: string) => {
    await TokenSelectionPage.saveTicker(assetType, assetName);
  }
);

When(/^I click to loose focus from value field$/, async () => {
  await TransactionNewPage.coinConfigure().clickToLoseFocus();
});

When(/^I hover over the ticker for "([^"]*)" asset in bundle (\d)$/, async (assetName: string, bundleIndex: number) => {
  if (assetName.length > 5) {
    assetName = assetName.slice(0, 5);
  }
  await TransactionNewPage.coinConfigure(bundleIndex, assetName).hoverOverTheTokenName();
});

Then(
  /^I enter a value of: ([^"]*) to the "([^"]*)" asset in bundle (\d)$/,
  async (valueToEnter: string, assetName: string, bundleIndex: number) => {
    assetName = assetName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : assetName;
    await TransactionNewPage.coinConfigure(bundleIndex, assetName).fillTokenValue(Number.parseFloat(valueToEnter));
  }
);

Then(/^I open cancel modal to trigger button validation$/, async () => {
  // workaround for test automation only to fire all events after finished typing
  await browser.keys(Key.Escape);
  await Modal.cancelButton.click();
});

Then(/^I click on transaction drawer background to lose focus$/, async () => {
  await TransactionNewPage.clickDrawerBackground();
});

Then(/^I enter a value of: ([^"]*) to the "([^"]*)" asset$/, async (valueToEnter: string, assetName: string) => {
  assetName = assetName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : assetName;
  await TransactionNewPage.coinConfigure(1, assetName).fillTokenValue(Number.parseFloat(valueToEnter));
});

Then(
  /^I enter a value of: ([^"]*) to the "([^"]*)" asset in bundle (\d) without clearing input$/,
  async (valueToEnter: string, assetName: string, bundleIndex: number) => {
    await TransactionNewPage.coinConfigure(bundleIndex, assetName).fillTokenValueWithoutClearingField(
      Number.parseFloat(valueToEnter)
    );
  }
);

Then(/^I hover over the value for "([^"]*)" asset in bundle (\d)$/, async (assetName: string, bundleIndex: number) => {
  assetName = assetName === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : assetName;
  await TransactionNewPage.coinConfigure(bundleIndex, assetName).hoverOverTheTokenValue();
});

Then(
  /^I enter a ([^"]*)% of total "([^"]*)" asset in bundle (\d)$/,
  async (percentage: string, assetName: string, bundleIndex: number) => {
    const tokenBalance: string = testContext.load(`${assetName}tokenBalance`);
    const value = Number.parseFloat(tokenBalance) * (Number.parseFloat(percentage) * (1 / 100));
    const valueToEnter = Number.parseFloat(value.toPrecision(2));
    await TransactionNewPage.coinConfigure(bundleIndex, assetName).fillTokenValueUsingKeys(valueToEnter);
  }
);

Then(/^I’ve entered accepted values for all fields of simple Tx$/, async () => {
  await new AddressInput().fillAddress(shelley.getAddress());
  await TransactionNewPage.coinConfigure(1).fillTokenValue(1);
});

Then(
  /^I've entered accepted values for all (Preprod|Mainnet) fields of simple Tx$/,
  async (network: 'Preprod' | 'Mainnet') => {
    const address = network === 'Mainnet' ? shelley.getMainnetAddress() : shelley.getTestnetAddress();
    await new AddressInput().fillAddress(address);
    await TransactionNewPage.coinConfigure(1).fillTokenValue(1);
  }
);

Then(/^I’ve entered accepted values for all fields of simple Tx for Byron with less than minimum value$/, async () => {
  await new AddressInput().fillAddress(byron.getAddress());
  await TransactionNewPage.coinConfigure(1).fillTokenValue(0.5);
});

Then(/^The Tx summary screen is displayed:$/, async (_ignored: string) => {
  const expectedTransactionSummaryData = {
    recipientAddress: shelley.getAddress(),
    valueToBeSent: [{ value: '1.00', currency: Asset.CARDANO.ticker }]
  };
  await transactionSummaryAssert.assertSeeSummaryPage([expectedTransactionSummaryData]);
});

Then(/^The Tx summary screen is displayed for Byron with minimum value:$/, async (_ignored: string) => {
  const expectedTransactionSummaryData = {
    recipientAddress: byron.getAddress(),
    valueToBeSent: [{ value: extensionUtils.isMainnet() ? '1.05' : '0.97', currency: Asset.CARDANO.ticker }]
  };
  await transactionSummaryAssert.assertSeeSummaryPage([expectedTransactionSummaryData]);
});

Then(
  /^The Tx summary screen is displayed for "([^"]*)" (main|other multiaddress|second account) address with "([^"]*)" tag$/,
  async (walletName, addressType: AddressType, tag) => {
    const expectedTransactionSummaryData = {
      recipientAddress: await parseWalletAddress(walletName, addressType),
      recipientAddressTag: tag,
      valueToBeSent: [{ value: '1.00', currency: Asset.CARDANO.ticker }]
    };
    await transactionSummaryAssert.assertSeeSummaryPage([expectedTransactionSummaryData]);
  }
);

Then(/^The password screen is displayed:$/, async (_ignored: string) => {
  await transactionPasswordExtendedAssert.assertSeePasswordPage();
});

Then(/^The Transaction error screen is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await transactionSubmittedAssert.assertSeeTransactionErrorPage(mode);
});

Then(/^The Transaction submitted screen is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await transactionSubmittedAssert.assertSeeTransactionSubmittedPage(mode);
  await TransactionSubmittedPage.saveTransactionHash();
});

Then(/^the 'Send' screen is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await drawerSendExtendedAssert.assertSeeSendSimpleScreen(mode);
});

Then(/^I verify transaction costs amount is around ([^"]*) ADA$/, async (expectedValueAda: string) => {
  await drawerSendExtendedAssert.assertSeeTransactionCosts(expectedValueAda);
});

Then(/^a dropdown showing the first ([^"]*) matches is displayed$/, async (noOfMatches: string) => {
  await drawerSendExtendedAssert.assertAmountOfResultsDisplayed(Number.parseInt(noOfMatches));
  await drawerSendExtendedAssert.assertResultsMatchContacts();
});

Then(/^first result in address dropdown has name "([^"]*)"$/, async (expectedName: string) => {
  await drawerSendExtendedAssert.assertAmountOfResultsDisplayed(1);
  await drawerSendExtendedAssert.assertFirstResultNameEquals(expectedName);
});

Then(/^the selected contact is added in the bundle recipient's address$/, async () => {
  await drawerSendExtendedAssert.assertAddedContactMatches();
});

When(/^I save fee value$/, async () => {
  await TransactionSummaryPage.saveFeeValue();
});

Then(
  /^The Tx details are displayed as "([^"]*)" for ADA with value: ([^"]*) and wallet: "([^"]*)" address$/,
  async (type: string, adaValue: string, walletName: string) => {
    const expectedActivityDetails: ExpectedActivityDetails = {
      transactionDescription: `${await t(type)}\n(1)`,
      hash: testContext.load('txHashValue'),
      transactionData: [
        {
          ada: `${adaValue} ${Asset.CARDANO.ticker}`,
          address: String(getTestWallet(walletName).address),
          addressTag: 'foreign'
        }
      ],
      status: 'Success'
    };
    await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
  }
);

Then(
  /^The Tx details are displayed as "([^"]*)" for ADA with value: "([^"]*)" and LaceCoin2 with value: "([^"]*)" and wallet: "([^"]*)" address$/,
  async (type: string, adaValue: string, laceCoin2Value: string, walletName: string) => {
    const expectedActivityDetails: ExpectedActivityDetails = {
      transactionDescription: `${await t(type)}\n(2)`,
      hash: testContext.load('txHashValue'),
      transactionData: [
        {
          ada: `${adaValue} ${Asset.CARDANO.ticker}`,
          address: String(getTestWallet(walletName).address),
          assets: [`${laceCoin2Value} LaceCoin2`]
        }
      ],
      status: 'Success'
    };
    await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
  }
);

Then(
  /^The Tx details are displayed as "([^"]*)" for (\d) tokens with following details:$/,
  async (type: string, numberOfTokens: number, options: DataTable) => {
    const txData = options.hashes();
    const parsedTxData: TransactionData[] = [];
    for (const entry of txData) {
      const parsedEntry = {
        ada: entry.ada,
        address: await parseWalletAddress(entry.address, entry.addressType as AddressType),
        addressTag: entry?.addressTag as AddressTag,
        assets: entry?.assets?.split(',')
      };
      parsedTxData.push(parsedEntry);
    }
    const expectedActivityDetails = {
      transactionDescription: `${await t(type)}\n(${numberOfTokens})`,
      hash: String(testContext.load('txHashValue')),
      transactionData: parsedTxData,
      status: 'Success'
    };
    await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
  }
);

Then(/a popup asking if you're sure you'd like to close it is displayed$/, async () => {
  await drawerSendExtendedAssert.assertSeeCancelTransactionModal(true);
});

Then(/^I click "(Agree|Cancel)" button on "You'll have to start again" modal$/, async (button: 'Agree' | 'Cancel') => {
  switch (button) {
    case 'Agree':
      await Modal.clickConfirmButton();
      break;
    case 'Cancel':
      await Modal.clickCancelButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^the NFT displays ([^"]*) in the value field$/, async (expectedValue: string) => {
  await drawerSendExtendedAssert.assertTokensValueAmount(expectedValue);
});

Then(
  /^send drawer is displayed with all its components in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await drawerSendExtendedAssert.assertSeeSendDrawer(mode);
  }
);

Then(
  /^the (\d*) selected (Tokens|NFTs) (are|are not) grayed out and display checkmark$/,
  async (amount: number, assetType: 'Tokens' | 'NFTs', selected: string) => {
    const shouldBeSelected: boolean = selected === 'are';
    await TransactionAssetSelectionAssert.assertAssetsAreSelected(shouldBeSelected, amount, assetType);
  }
);

Then(/^I (see|do not see) counter with number: (\d*) of selected tokens$/, async (visible: string, amount: number) => {
  const isVisible: boolean = visible === 'see';
  await TransactionAssetSelectionAssert.assertSelectedAssetsCounter(isVisible, amount);
});

Then(/^the selected assets (are|are not) displayed in bundle (\d*)$/, async (selected: string, bundleIndex: number) => {
  const shouldBeSelected: boolean = selected === 'are';
  await drawerSendExtendedAssert.assertSelectedTokensDisplayed(shouldBeSelected, bundleIndex);
});

Then(
  /^(Tokens|NFTs) (\d*) (is|is not) selected$/,
  async (assetType: 'Tokens' | 'NFTs', index: number, selected: string) => {
    const shouldBeSelected: boolean = selected === 'are';
    await TransactionAssetSelectionAssert.assertSpecificAssetSelected(shouldBeSelected, assetType, index);
  }
);

Then(
  /^the displayed ticker for (NFTs|Tokens) has the correct amount of characters$/,
  async (assetType: 'NFTs' | 'Tokens') => {
    await drawerSendExtendedAssert.assertAmountOfCharactersInAsset(assetType);
  }
);

Then(/^I see ([^"]*) as displayed value$/, async (expectedValue: string) => {
  await drawerSendExtendedAssert.assertEnteredValue(expectedValue);
});

Then(/^the displayed value switches to: ([^"]*)$/, async (expectedValue: string) => {
  await drawerSendExtendedAssert.assertTokensValueAmount(expectedValue);
});

Then(
  /^I (see|do not see) a tooltip showing full (value|name): "([^"]*)" for (NFTs|Tokens)$/,
  async (visible: string, tooltip: 'value' | 'name', expectedValue: string, assetType: 'NFTs' | 'Tokens') => {
    const isVisible: boolean = visible === 'see';
    tooltip === 'name'
      ? await drawerSendExtendedAssert.assertTokenTickerDisplayedInTooltip(isVisible, assetType)
      : await drawerSendExtendedAssert.assertTokenValueDisplayedInTooltip(isVisible, expectedValue);
  }
);
Then(/^incorrect network address error banner is displayed$/, async () => {
  await drawerSendExtendedAssert.assertSeeAddressErrorBanner();
});

Then(/^"Bin" button inside metadata input is (enabled|disabled)$/, async (state: 'enabled' | 'disabled') => {
  await drawerSendExtendedAssert.assertMetadataBinButtonEnabled(state === 'enabled');
});

When(/^I click "Bin" button inside metadata input$/, async () => {
  await TransactionNewPage.metadataBinButton.click();
});

Then(/^Metadata input is empty$/, async () => {
  await drawerSendExtendedAssert.assertMetadataInputIsEmpty();
});

Then(/^"Incorrect address" error (is|is not) displayed under address input field$/, async (state: 'is' | 'is not') => {
  await drawerSendExtendedAssert.assertSeeIncorrectAddressError(1, state === 'is');
});

Then(/^"Review transaction" button is (enabled|disabled) on "Send" page$/, async (state: 'enabled' | 'disabled') => {
  await drawerSendExtendedAssert.assertReviewTransactionButtonIsEnabled(state === 'enabled');
});

Then(/^"Review transaction" button (is|is not) displayed on "Send" page$/, async (state: 'is' | 'is not') => {
  await drawerSendExtendedAssert.assertReviewTransactionButtonIsDisplayed(state === 'is');
});

Then(/^"Insufficient balance" error (is|is not) displayed on "Send" page$/, async (state: 'is' | 'is not') => {
  await drawerSendExtendedAssert.assertSeeAnyInsufficientBalanceError(state === 'is');
});

When(
  /^I click "(Review transaction|Cancel|Add bundle)" button on "Send" page$/,
  async (button: 'Review transaction' | 'Cancel' | 'Add bundle') => {
    switch (button) {
      case 'Review transaction':
        await TransactionNewPage.reviewTransactionButton.waitForEnabled({ timeout: 15_000 });
        await TransactionNewPage.reviewTransactionButton.click();
        break;
      case 'Cancel':
        await TransactionNewPage.cancelTransactionButton.waitForClickable();
        await TransactionNewPage.cancelTransactionButton.click();
        break;
      case 'Add bundle':
        await TransactionNewPage.addBundleButton.waitForClickable();
        await TransactionNewPage.addBundleButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(/^I click "Confirm" button on "Transaction summary" page$/, async () => {
  await TransactionSummaryPage.confirmButton.waitForEnabled();
  await TransactionSummaryPage.confirmButton.click();
});

When(/^I click "(Save|Cancel)" button on "Add address" drawer in send flow$/, async (button: 'Save' | 'Cancel') => {
  switch (button) {
    case 'Cancel':
      await AddNewAddressDrawer.clickOnCancelButton();
      break;
    case 'Save':
      await AddNewAddressDrawer.clickOnSaveAddressButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(
  /^"(All gone! You've already selected everything|No results matching your search|You don't have any tokens|You don't have any NFTs to send)" message (is|is not) displayed inside asset selector$/,
  async (
    text:
      | "All gone! You've already selected everything"
      | 'No results matching your search'
      | "You don't have any tokens"
      | "You don't have any NFTs to send",
    state: 'is' | 'is not'
  ) => {
    switch (text) {
      case "All gone! You've already selected everything":
        await TransactionAssetSelectionAssert.assertSeeAllAssetsUsedMessage(state === 'is');
        break;
      case 'No results matching your search':
        await TransactionAssetSelectionAssert.assertSeeNoMatchingResultsMessage(state === 'is');
        break;
      case "You don't have any tokens":
        await TransactionAssetSelectionAssert.assertSeeNoAssetsAvailableMessage('tokens', state === 'is');
        break;
      case "You don't have any NFTs to send":
        await TransactionAssetSelectionAssert.assertSeeNoAssetsAvailableMessage('nfts', state === 'is');
        break;
      default:
        throw new Error(`Unsupported message: ${text}`);
    }
  }
);

When(/^I click "View transaction" button on submitted transaction page$/, async () => {
  await TransactionSubmittedPage.viewTransactionButton.waitForClickable();
  await TransactionSubmittedPage.viewTransactionButton.click();
});

Then(/^I enter (correct|incorrect) password and confirm the transaction$/, async (type: string) => {
  const password =
    type === 'correct' ? String(getTestWallet(TestWalletName.TestAutomationWallet).password) : 'somePassword';
  await TransactionPasswordPage.fillPasswordAndConfirm(password);
});

Then(
  /^recipients address input contains address "([^"]*)" and name "([^"]*)"$/,
  async (lastCharsOfAddress: string, addressName: string) => {
    await drawerSendExtendedAssert.assertSeeAddressWithNameInRecipientsAddressInput(lastCharsOfAddress, addressName);
  }
);

Then(/^recipients address input contains address entry with name "([^"]*)"$/, async (addressName: string) => {
  await drawerSendExtendedAssert.assertSeeAddressNameInRecipientsAddressInput(addressName);
});

Then(/^recipients address input (\d+) is empty$/, async (inputIndex: number) => {
  await drawerSendExtendedAssert.assertSeeEmptyRecipientsAddressInput(inputIndex);
});

Then(/^I see (ADA|tADA) in transaction fee$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await drawerSendExtendedAssert.assertSeeTickerTransactionCostADA(expectedTicker);
});

Then(/^I see (ADA|tADA) in "Review transaction" transaction fee$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await drawerSendExtendedAssert.assertSeeTickerOnReviewTransactionFee(expectedTicker);
});

Then(/^I see (ADA|tADA) in "Review transaction" transaction amount$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await drawerSendExtendedAssert.assertSeeTickerOnReviewTransactionAmount(expectedTicker);
});

Then(/^Red exclamation icon is displayed next to ADA handle$/, async () => {
  await drawerSendExtendedAssert.assertSeeIconForInvalidAdaHandle(true);
});

Then(/^"Handle not found" error is displayed under address input in "Send" drawer$/, async () => {
  await drawerSendExtendedAssert.assertSeeAdaHandleError(true);
});

Then(/^search loader is displayed inside address input field$/, async () => {
  await drawerSendExtendedAssert.assertSeeSearchLoader(true);
});

Then(
  /^"Add address" button is (enabled|disabled) in the bundle (\d) recipient's address input$/,
  async (state: 'enabled' | 'disabled', inputIndex: number) => {
    await drawerSendExtendedAssert.assertAddressBookButtonEnabled(inputIndex, state === 'enabled');
  }
);

Then(/^I see review handle banner for handle: "([^"]*)"$/, async (handleName: string) => {
  await drawerSendExtendedAssert.assertSeeReviewAddressBanner(handleName);
});

When(/^I click "Review" button in review handle banner$/, async () => {
  await TransactionNewPage.banner.button.click();
});
