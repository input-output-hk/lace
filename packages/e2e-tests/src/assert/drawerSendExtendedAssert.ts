/* eslint-disable no-undef */
import webTester from '../actor/webTester';
import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { TestnetPatterns } from '../support/patterns';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { AddressInput } from '../elements/addressInput';
import coinConfigureAssert from './coinConfigureAssert';
import assetInputAssert from './assetInputAssert';
import { AssetInput } from '../elements/newTransaction/assetInput';
import testContext from '../utils/testContext';
import Banner from '../elements/banner';
import { getAddressByName, validAddress, validAddress2 } from '../data/AddressData';
import { TransactionBundle } from '../elements/newTransaction/transactionBundle';
import ModalAssert from './modalAssert';
import CommonDrawerElements from '../elements/CommonDrawerElements';
import TransactionsPage from '../elements/transactionsPage';
import { browser } from '@wdio/globals';
import { truncateAddressEntryName } from '../utils/addressBookUtils';

class DrawerSendExtendedAssert {
  assertSeeSendDrawer = async (mode: 'extended' | 'popup') => {
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.title'));
    const assetInput = new AssetInput();
    const transactionNewPage = new TransactionNewPage();
    const addressInput = new AddressInput();
    await webTester.seeWebElement(addressInput.input());
    expect(await webTester.getTextValueFromElement(addressInput.label())).to.equal(
      await t('core.destinationAddressInput.recipientAddress')
    );
    await addressInput.ctaButton.waitForDisplayed();
    await coinConfigureAssert.assertSeeCoinConfigure();
    await assetInputAssert.assertSeeAssetInput();
    await webTester.seeWebElement(assetInput.assetAddButton());
    await transactionNewPage.txMetadataInputField.waitForDisplayed();
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.metadata.addANote'));
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.transactionCosts'));
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.transactionFee'));
    await webTester.seeWebElement(transactionNewPage.attributeValueAda());
    await transactionNewPage.attributeValueFiat.waitForDisplayed();
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.footer.review'));
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.footer.cancel'));
    switch (mode) {
      case 'extended':
        await transactionNewPage.addBundleButton.waitForDisplayed();
        await webTester.seeWebElement(transactionNewPage.bundleDescription());
        expect(await transactionNewPage.getBundleDescription()).to.equal(
          await t('browserView.transaction.send.advancedFlowText')
        );
        await new CommonDrawerElements().drawerHeaderCloseButton.waitForClickable();
        break;
      case 'popup':
        await new CommonDrawerElements().drawerHeaderBackButton.waitForClickable();
        await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.drawer.addBundle'));
        break;
    }
  };

  async assertSeeSendSimpleScreen(mode: 'extended' | 'popup') {
    await webTester.waitUntilSeeElementContainingText(await t('browserView.transaction.send.title'));

    const transactionNewPage = new TransactionNewPage();

    if (mode === 'extended') {
      await transactionNewPage.addBundleButton.waitForDisplayed();
    }
    await webTester.seeWebElement(transactionNewPage.addressInput().container());
    await webTester.seeWebElement(transactionNewPage.coinConfigure().container());

    await webTester.seeWebElement(transactionNewPage.attributeLabel());
    expect(await webTester.getTextValueFromElement(transactionNewPage.attributeLabel())).to.equal(
      await t('browserView.transaction.send.transactionFee')
    );

    await webTester.seeWebElement(transactionNewPage.attributeValueAda());
    expect((await webTester.getTextValueFromElement(transactionNewPage.attributeValueAda())) as string).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
    await transactionNewPage.attributeValueFiat.waitForDisplayed();
    expect(await transactionNewPage.attributeValueFiat.getText()).to.match(TestnetPatterns.USD_VALUE_REGEX);
  }

  async assertSeeCoinSelectorWithTitle(expectedTokenName: string) {
    const tokenName = await new CoinConfigure().getName();
    expect(tokenName).to.contain(expectedTokenName);
  }

  async assertSeeCoinSelectorWithTokenInputValue(expectedValue: number) {
    const tokenValue = await new CoinConfigure().getBalanceValue();
    expect(tokenValue).to.equal(expectedValue);
  }

  async assertSeeTransactionCosts(expectedValueAda: string) {
    const transactionNewPage = new TransactionNewPage();
    if (expectedValueAda !== '0.00') {
      await browser.waitUntil(async () => (await transactionNewPage.getValueAda()) !== 0, {
        interval: 500,
        timeout: 5000,
        timeoutMsg: 'failed while waiting for transaction fee to change'
      });
    }

    const valueAda = Number(await transactionNewPage.getValueAda());

    expect(expectedValueAda).to.be.oneOf([
      valueAda.toFixed(2).toString(),
      (valueAda + 0.01).toFixed(2).toString(),
      (valueAda - 0.01).toFixed(2).toString()
    ]);

    expect(await transactionNewPage.attributeValueFiat.getText()).to.match(TestnetPatterns.USD_VALUE_REGEX);
  }

  async assertSeeAdaAllocationCosts(expectedValueAdaAllocation: string) {
    // may need to be updated in the future
    await browser.pause(1000);
    const transactionNewPage = new TransactionNewPage();
    const valueAdaAllocation = Number(await transactionNewPage.getValueAdaAllocation());

    expect(Number(expectedValueAdaAllocation)).to.be.within(valueAdaAllocation - 0.1, valueAdaAllocation + 0.1);

    expect(
      (await webTester.getTextValueFromElement(transactionNewPage.attributeAdaAllocationValueFiat())) as string
    ).to.match(TestnetPatterns.USD_VALUE_REGEX);
  }

  async assertAmountOfResultsDisplayed(noOfResults: number) {
    const transactionNewPage = new TransactionNewPage();
    const rowsNumber = (await transactionNewPage.getAddressBookSearchResultsRows()).length;
    expect(rowsNumber).to.equal(noOfResults);
  }

  async assertResultsMatchContacts() {
    const transactionNewPage = new TransactionNewPage();
    // Verify 1st address
    expect(await transactionNewPage.getContactName(1)).to.equal(truncateAddressEntryName(validAddress.getName()));
    const partOfActualAddress1 = String(await transactionNewPage.getPartialContactAddress(1));
    expect(getAddressByName(validAddress.getName())).contains(partOfActualAddress1);
    // Verify 2nd address
    expect(await transactionNewPage.getContactName(2)).to.equal(truncateAddressEntryName(validAddress2.getName()));
    const partOfActualAddress2 = String(await transactionNewPage.getPartialContactAddress(2));
    expect(getAddressByName(validAddress2.getName())).contains(partOfActualAddress2);
  }

  async assertFirstResultNameEquals(expectedName: string) {
    const transactionNewPage = new TransactionNewPage();
    expect(await transactionNewPage.getContactName(1)).to.equal(expectedName);
  }

  async assertAddedContactMatches() {
    const transactionNewPage = new TransactionNewPage();
    expect(await transactionNewPage.getContactName(1)).to.equal(truncateAddressEntryName(validAddress.getName()));
    const partOfActualAddress = String(await transactionNewPage.getPartialContactAddress(1));
    expect(getAddressByName(validAddress.getName())).contains(partOfActualAddress);
  }

  async assertSeeMetadataCounter(shouldSee: boolean) {
    await new TransactionNewPage().txMetadataCounter.waitForDisplayed({ reverse: !shouldSee });
  }

  async assertSeeMetadataCounterWarning(shouldSee: boolean) {
    const colorProperty = await new TransactionNewPage().txMetadataCounter.getCSSProperty('color');
    // Verify if metadata counter has changed its color to light red (#ff5470) or not
    shouldSee
      ? expect(colorProperty.parsed.hex).to.equal('#ff5470')
      : expect(colorProperty.parsed.hex).to.not.equal('#ff5470');
  }

  async assertTokensValueAmount(expectedValue: string) {
    const coinConfigure = new CoinConfigure();
    const tokenAmount = (await coinConfigure.getInputValue()) as string;
    expect(tokenAmount).to.equal(expectedValue);
  }

  async assertSeeCancelTransactionModal(shouldSee: boolean) {
    await ModalAssert.assertSeeModalContainer(shouldSee);
    if (shouldSee) {
      const title = await t('general.warnings.youHaveToStartAgain');
      const expectedTextLine1 = await t('general.warnings.areYouSureYouWantToExit');
      const expectedTextLine2 = await t('general.warnings.thisWillNotBeSaved');
      const description = `${expectedTextLine1}\n${expectedTextLine2}`;
      const cancelButtonLabel = await t('general.button.cancel');
      const confirmButtonLabel = await t('general.button.agree');
      await ModalAssert.assertSeeModal(title, description, cancelButtonLabel, confirmButtonLabel);
    }
  }

  async assertDefaultInputsDoNotContainValues() {
    const coinConfigure = new CoinConfigure();
    const addressInput = new AddressInput();
    expect(await webTester.getAttributeValue(addressInput.input().toJSLocator(), 'value')).to.be.empty;
    expect(await webTester.getAttributeValue(coinConfigure.input().toJSLocator(), 'value')).to.equal('0.00');
  }

  async assertInsufficientBalanceErrorInBundle(bundleIndex: number, assetName: string, shouldSee: boolean) {
    const bundle = new CoinConfigure(bundleIndex, assetName);
    await bundle.insufficientBalanceError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await bundle.insufficientBalanceError.getText()).to.equal(
        await t('browserView.transaction.send.error.insufficientBalance')
      );
    }
  }

  async assertSeeAnyInsufficientBalanceError(shouldSee: boolean) {
    const coinConfigure = new CoinConfigure();
    await coinConfigure.insufficientBalanceError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await coinConfigure.insufficientBalanceError.getText()).to.equal(
        await t('browserView.transaction.send.error.insufficientBalance')
      );
    }
  }

  async assertSelectedTokensDisplayed(shouldBeSelected: boolean, bundleIndex: number) {
    const amountOfAssets = Number(testContext.load(`amountOfAssetsInBundle${bundleIndex}`));
    for (let i = 1; i <= amountOfAssets; i++) {
      const assetName = String(testContext.load(`bundle${bundleIndex}asset${i}`));
      const bundle = new CoinConfigure(bundleIndex, assetName);
      shouldBeSelected ? await webTester.seeWebElement(bundle) : await webTester.dontSeeWebElement(bundle);
    }
  }

  async assertAmountOfCharactersInAsset(assetType: string) {
    const savedTicker = String(testContext.load('savedTicker'));
    const amountOfCharacters = String(await new CoinConfigure().getName()).replace('...', '').length;
    if (assetType === 'Tokens') {
      savedTicker.length <= 5
        ? expect(savedTicker.length).to.equal(amountOfCharacters)
        : expect(amountOfCharacters).to.equal(5);
    } else {
      savedTicker.length <= 10
        ? expect(savedTicker.length).to.equal(amountOfCharacters)
        : expect(amountOfCharacters).to.equal(10);
    }
  }

  async assertTokenTickerDisplayedInTooltip(isVisible: boolean, assetType: string) {
    const savedTicker = String(testContext.load('savedTicker'));
    if (isVisible) {
      if (assetType === 'Tokens') {
        const textInTooltip = (await webTester.getTextValueFromElement(new CoinConfigure().tooltip())) as string;
        if (savedTicker.slice(0, 6) === 'asset1') {
          const assetFirstSection = savedTicker.slice(0, 10);
          const assetLastSection = savedTicker.slice(savedTicker.length, -4);
          expect(textInTooltip.startsWith(assetFirstSection)).to.be.true;
          expect(textInTooltip.endsWith(assetLastSection)).to.be.true;
        } else {
          expect(textInTooltip).to.equal(savedTicker);
        }
      } else if (assetType === 'NFTs' && savedTicker.length > 10) {
        expect((await webTester.getTextValueFromElement(new CoinConfigure().tooltip())) as string).to.equal(
          savedTicker
        );
      }
    } else {
      await webTester.dontSeeWebElement(new CoinConfigure().tooltip());
    }
  }

  async assertTokenValueDisplayedInTooltip(isVisible: boolean, expectedValue: string) {
    const coinConfigure = new CoinConfigure();
    await (isVisible
      ? expect(await webTester.getTextValueFromElement(coinConfigure.tooltip())).to.equal(expectedValue)
      : webTester.dontSeeWebElement(coinConfigure.tooltip()));
  }

  async assertEnteredValue(expectedValue: string) {
    expect(await $(new CoinConfigure().input().toJSLocator()).getValue()).to.equal(expectedValue);
  }

  async assertSeeAddressErrorBanner() {
    const text = await Banner.description.getText();
    expect(text).to.equal(await t('general.errors.wrongNetworkAddress'));
  }

  async assertMetadataBinButtonEnabled(isEnabled: boolean) {
    const transactionNewPage = new TransactionNewPage();
    await transactionNewPage.metadataBinButton.waitForEnabled({ reverse: !isEnabled });
  }

  async assertMetadataInputIsEmpty() {
    const transactionNewPage = new TransactionNewPage();
    expect(await transactionNewPage.txMetadataInputField.getValue()).to.be.empty;
  }

  async assertSeeIncorrectAddressError(shouldSee: boolean) {
    await new TransactionBundle().bundleAddressInputError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await new TransactionBundle().bundleAddressInputError.getText()).to.equal(
        await t('general.errors.incorrectAddress')
      );
    }
  }

  async assertReviewTransactionButtonIsEnabled(shouldBeEnabled: boolean) {
    await new TransactionNewPage().reviewTransactionButton.waitForClickable({
      reverse: !shouldBeEnabled,
      timeout: 10_000
    });
  }

  async assertReviewTransactionButtonIsDisplayed(shouldBeDisplayed: boolean) {
    await new TransactionNewPage().reviewTransactionButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await new TransactionNewPage().reviewTransactionButton.getText()).to.equal(
        await t('browserView.transaction.send.footer.review')
      );
    }
  }

  assertSeeAddressWithNameInRecipientsAddressInput = async (address: string, name: string) => {
    await webTester.waitUntilSeeElementContainingText(name);
    const text = await webTester.getTextValueFromElement(new AddressInput().container());
    expect(text).contains(address);
  };

  assertSeeAddressNameInRecipientsAddressInput = async (expectedName: string) => {
    expect(await new AddressInput().name().getText()).to.equal(expectedName);
  };

  assertSeeEmptyRecipientsAddressInput = async (index?: number) => {
    const text = await webTester.getTextValueFromElement(new AddressInput(index).container());
    expect(text).to.equal(await t('core.destinationAddressInput.recipientAddress'));
  };

  async assertSeeTickerTransactionCostADA(expectedTicker: 'ADA' | 'tADA') {
    await this.assertSeeTicker(expectedTicker, await TransactionsPage.transactionCostADA);
  }

  async assertSeeTickerOnReviewTransactionFee(expectedTicker: 'ADA' | 'tADA') {
    await this.assertSeeTicker(expectedTicker, await TransactionsPage.transactionFee);
  }

  async assertSeeTickerOnReviewTransactionAmount(expectedTicker: 'ADA' | 'tADA') {
    await this.assertSeeTicker(expectedTicker, await TransactionsPage.sendAmount);
  }

  async assertSeeTicker(expectedTicker: 'ADA' | 'tADA', elementToCheck: WebdriverIO.Element) {
    const regex = expectedTicker === 'ADA' ? /[^t]ADA/g : /tADA/g;

    let tickerDisplayed = (await elementToCheck.getText()) as string;
    tickerDisplayed = String(tickerDisplayed.match(regex));

    if (expectedTicker === 'ADA') tickerDisplayed = tickerDisplayed.trim().slice(-3);
    expect(tickerDisplayed).to.equal(expectedTicker);
  }

  async assertSeeIconForInvalidAdaHandle(shouldBeDisplayed: boolean) {
    const addressInput = new AddressInput();
    await addressInput.invalidAdaHandleIcon.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }

  async assertSeeAdaHandleError(shouldBeDisplayed: boolean) {
    const addressInput = new AddressInput();
    await addressInput.adaHandleError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await addressInput.adaHandleError.getText()).to.equal(await t('general.errors.incorrectHandle'));
    }
  }

  async assertSeeSearchLoader(shouldBeDisplayed: boolean) {
    const addressInput = new AddressInput();
    await addressInput.searchLoader.waitForDisplayed({ reverse: !shouldBeDisplayed, interval: 150 });
  }

  async assertAddressBookButtonEnabled(bundleIndex: number, shouldBeEnabled: boolean) {
    const addressInput = new AddressInput(bundleIndex);
    await addressInput.ctaButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertSeeReviewAddressBanner(handle: string) {
    const transactionNewPage = new TransactionNewPage();
    await transactionNewPage.banner.container.waitForDisplayed();
    await transactionNewPage.banner.icon.waitForDisplayed();
    await transactionNewPage.banner.description.waitForDisplayed();
    expect(await transactionNewPage.banner.description.getText()).to.contain(
      (await t('addressBook.reviewModal.banner.browserDescription')).replace('{{name}}', handle)
    );
    await transactionNewPage.banner.button.waitForDisplayed();
    expect(await transactionNewPage.banner.button.getText()).to.equal(
      (await t('addressBook.reviewModal.banner.confirmReview.button')).replace('{{name}}', handle)
    );
  }
}

export default new DrawerSendExtendedAssert();
