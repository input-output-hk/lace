import { expect } from 'chai';
import webTester from '../../actor/webTester';
import { TransactionBundle } from '../../elements/newTransaction/transactionBundle';
import coinConfigureAssert from '../coinConfigureAssert';
import assetInputAssert from '../assetInputAssert';
import TransactionNewPage from '../../elements/newTransaction/transactionNewPage';
import { t } from '../../utils/translationService';
import { CoinConfigure } from '../../elements/newTransaction/coinConfigure';
import { AssetInput } from '../../elements/newTransaction/assetInput';
import { AddressInput } from '../../elements/AddressInput';

class TransactionBundleAssert {
  assertSeeBundles = async (expectedNumberOfBundles: number) => {
    for (let i = 1; i <= expectedNumberOfBundles; i++) {
      const bundle = new TransactionBundle(i);
      if (expectedNumberOfBundles > 1) {
        expect(await webTester.getTextValueFromElement(bundle.bundleTitle())).to.equal(
          `${await t('core.outputSummaryList.output')} ${i}`
        );
        await webTester.seeWebElement(bundle.bundleRemoveButton());
      }
      await new AddressInput(i).input.waitForDisplayed();
      await coinConfigureAssert.assertSeeCoinConfigure();
      await assetInputAssert.assertSeeAssetInput(i);
    }
  };

  async assertSeeTokenNameInBundleAndCoinConfigure(expectedName: string, bundleIndex: number) {
    await TransactionNewPage.cancelTransactionButton.waitForStable();
    const tokenName = await new TransactionBundle(bundleIndex)
      .bundleAssetInput()
      .coinConfigure(bundleIndex, expectedName.replace('...', ''))
      .nameElement.getText();
    expect(tokenName).to.contain(expectedName);
  }

  async assertSeeAssetNameAndValueInBundle(expectedName: string, expectedValue: number, bundleIndex: number) {
    const asset = new TransactionBundle(bundleIndex).bundleAssetInput().coinConfigure(bundleIndex, expectedName);

    const tokenName = await asset.nameElement.getText();
    const tokenValue = await asset.getAmount();

    expect(tokenName).to.contain(expectedName);
    expect(tokenValue).to.equal(Number(expectedValue));
  }

  async assertTokenNameNotPresentInBundleAndCoinConfigure(assetName: string, bundleIndex: number) {
    await new CoinConfigure(bundleIndex, assetName).container.waitForDisplayed({ reverse: true });
  }

  async assertDeleteButtonForAssetNotPresentInBundle(assetName: string, bundleIndex: number) {
    await new CoinConfigure(bundleIndex, assetName).assetRemoveButton.waitForDisplayed({ reverse: true });
  }

  async assertInvalidAddressErrorIsDisplayed(index: number) {
    await TransactionNewPage.invalidAddressError(index).waitForDisplayed();
  }

  async assertSetMaxAmountInBundleAndCoinConfigure(bundleIndex: number, assetName: string) {
    const bundle = new CoinConfigure(bundleIndex, assetName);
    const tokenBalance = Number(
      String(await bundle.balanceValueElement.getText())
        .replace('Balance: ', '')
        .replace(',', '')
    );
    const tokenInputAmount = Number(String(await bundle.input.getValue()).replace(',', ''));
    if (assetName === 'tADA' || assetName === 'ADA') {
      const fee = Number(await TransactionNewPage.getTransactionFeeValueInAda());
      expect(tokenBalance).to.be.greaterThan(tokenInputAmount + fee);
      expect(tokenInputAmount - fee).to.be.greaterThan(tokenBalance - tokenBalance * 0.003);
    } else {
      expect(tokenBalance).to.equal(tokenInputAmount);
    }
  }

  async assertAddAssetButtonIsEnabled(bundleIndex: number, shouldBeEnabled: boolean) {
    await new AssetInput(bundleIndex).assetAddButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new TransactionBundleAssert();
