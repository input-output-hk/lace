import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { Logger } from '../support/logger';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class CoinConfigureAssert {
  async assertSeeNonEmptyBalanceInCoinConfigure() {
    const balance = (await new CoinConfigure().balanceValueElement.getText()).replace('Balance: ', '').replace(',', '');
    expect(Number(balance)).to.be.greaterThan(0);
    const balanceFiat = await new CoinConfigure().balanceFiatValueElement.getText();
    if (balanceFiat !== '-') {
      expect(Number(balanceFiat)).to.be.greaterThan(0);
    } else {
      Logger.log('Fiat balance = "-", skipping validation');
    }
  }

  async assertSeeCoinConfigure() {
    const coinConfigure = new CoinConfigure();
    await coinConfigure.nameElement.waitForDisplayed();
    await coinConfigure.balanceValueElement.waitForDisplayed();
    await coinConfigure.input.waitForDisplayed();
    await coinConfigure.balanceFiatValueElement.waitForDisplayed();
  }

  async assertSeeMaxButton(shouldSee: boolean, index?: number) {
    const coinConfigure = new CoinConfigure(index);
    await coinConfigure.assetMaxButton.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await coinConfigure.assetMaxButton.getText()).to.equal(
        await t('package.core.assetInput.maxButton', 'core')
      );
    }
  }
}

export default new CoinConfigureAssert();
