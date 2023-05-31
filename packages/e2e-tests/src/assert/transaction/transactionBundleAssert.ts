import { expect } from 'chai';
import webTester from '../../actor/webTester';
import { TransactionBundle } from '../../elements/newTransaction/transactionBundle';
import coinConfigureAssert from '../coinConfigureAssert';
import assetInputAssert from '../assetInputAssert';
import { TransactionNewPage } from '../../elements/newTransaction/transactionNewPage';
import { t } from '../../utils/translationService';
import { CoinConfigure } from '../../elements/newTransaction/coinConfigure';

class TransactionBundleAssert {
  assertSeeBundles = async (expectedNumberOfBundles: number) => {
    for (let i = 1; i <= expectedNumberOfBundles; i++) {
      const bundle = new TransactionBundle(i);
      if (expectedNumberOfBundles > 1) {
        await expect(await webTester.getTextValueFromElement(bundle.bundleTitle())).to.equal(
          `${await t('core.outputSummaryList.output')} ${i}`
        );
        await webTester.seeWebElement(bundle.bundleRemoveButton());
      }
      await webTester.seeWebElement(bundle.bundleAddressInput().input());
      await webTester.seeWebElement(bundle.bundleAssetInput());
      await coinConfigureAssert.assertSeeCoinConfigure();
      await assetInputAssert.assertSeeAssetInput();
    }
  };

  async assertSeeTokenNameInBundleAndCoinConfigure(expectedName: string, bundleIndex: number) {
    const tokenName = await new TransactionBundle(bundleIndex)
      .bundleAssetInput()
      .coinConfigure(bundleIndex, expectedName.replace('...', ''))
      .getName();
    await expect(tokenName).to.contain(expectedName);
  }

  async assertSeeAssetNameAndValueInBundle(expectedName: string, expectedValue: number, bundleIndex: number) {
    const asset = await new TransactionBundle(bundleIndex).bundleAssetInput().coinConfigure(bundleIndex, expectedName);

    const tokenName = await asset.getName();
    const tokenValue = await asset.getAmount();

    await expect(tokenName).to.contain(expectedName);
    await expect(tokenValue).to.equal(Number(expectedValue));
  }

  async assertTokenNameNotPresentInBundleAndCoinConfigure(assetName: string, bundleIndex: number) {
    await webTester.dontSeeWebElement(new CoinConfigure(bundleIndex, assetName));
  }

  async assertDeleteButtonForAssetNotPresentInBundle(assetName: string, bundleIndex: number) {
    await webTester.dontSeeWebElement(new CoinConfigure(bundleIndex, assetName).assetRemoveButton());
  }

  async assertInvalidAddressErrorIsDisplayed(index: number) {
    await webTester.seeWebElement(new TransactionNewPage().invalidAddressError(index));
  }

  async assertSetMaxAmountInBundleAndCoinConfigure(bundleIndex: number, assetName: string) {
    const bundle = new CoinConfigure(bundleIndex, assetName);
    const tokenBalance = Number(
      String(await bundle.getBalanceValue())
        .replace('Balance: ', '')
        .replace(',', '')
    );
    const tokenInputAmount = Number(String(await bundle.getInputValue()).replace(',', ''));
    if (assetName === 'tADA' || assetName === 'ADA') {
      const fee = Number(await new TransactionNewPage().getValueAda());
      await expect(tokenBalance).to.be.greaterThan(tokenInputAmount + fee);
      await expect(tokenInputAmount - fee).to.be.greaterThan(tokenBalance - tokenBalance * 0.003);
    } else {
      await expect(tokenBalance).to.equal(tokenInputAmount);
    }
  }

  async assertAddAssetButtonIsEnabled(bundleIndex: number, shouldBeEnabled: boolean) {
    const addAssetButton = await $(
      new TransactionBundle(bundleIndex).bundleAssetInput().assetAddButton().toJSLocator()
    );
    await addAssetButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new TransactionBundleAssert();
