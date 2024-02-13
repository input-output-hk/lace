import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { Logger } from '../support/logger';
import webTester from '../actor/webTester';
import { expect } from 'chai';
import { TokenSearchResult } from '../elements/newTransaction/tokenSearchResult';

class CoinConfigureAssert {
  async assertSeeNonEmptyBalanceInCoinConfigure() {
    const balance = ((await new CoinConfigure().getBalanceValue()) as string).replace('Balance: ', '').replace(',', '');
    expect(Number(balance)).to.be.greaterThan(0);
    const balanceFiat = await new CoinConfigure().getFiatBalanceValue();
    if (balanceFiat !== '-') {
      expect(Number(balanceFiat)).to.be.greaterThan(0);
    } else {
      Logger.log('Fiat balance = "-", skipping validation');
    }
  }

  async assertTokenDisplayed(tokenName: string, shouldBeDisplayed: boolean) {
    const token = await $(new TokenSearchResult(tokenName).toJSLocator());
    await token.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }

  async assertSeeCoinConfigure() {
    const coinConfigure = new CoinConfigure();
    await webTester.seeWebElement(coinConfigure.nameElement());
    await webTester.seeWebElement(coinConfigure.balanceValueElement());
    await webTester.seeWebElement(coinConfigure.input());
    await webTester.seeWebElement(coinConfigure.balanceFiatValueElement());
  }

  async assertSeeMaxButton(shouldSee: boolean, index?: number) {
    const coinConfigure = new CoinConfigure(index);
    await (shouldSee
      ? webTester.seeWebElement(coinConfigure.assetMaxButton())
      : webTester.dontSeeWebElement(coinConfigure.assetMaxButton()));
  }
}

export default new CoinConfigureAssert();
