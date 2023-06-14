import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { Logger } from '../support/logger';
import webTester from '../actor/webTester';
import { TokenSelectionPage } from '../elements/newTransaction/tokenSelectionPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { TokenSearchResult } from '../elements/newTransaction/tokenSearchResult';

class CoinConfigureAssert {
  async assertSeeNonEmptyBalanceInCoinConfigure() {
    const balance = ((await new CoinConfigure().getBalanceValue()) as string).replace('Balance: ', '').replace(',', '');
    await expect(Number(balance)).to.be.greaterThan(0);
    const balanceFiat = await new CoinConfigure().getFiatBalanceValue();
    if (balanceFiat === '-') {
      Logger.log('Fiat balance = "-", skipping validation');
    } else {
      await expect(Number(balanceFiat)).to.be.greaterThan(0);
    }
  }

  async assertSeeTokenSelectionPageButtons() {
    const tokenSelectionPage = new TokenSelectionPage();
    await webTester.seeWebElement(tokenSelectionPage.tokensButton());
    await webTester.seeWebElement(tokenSelectionPage.nftsButton());

    await expect(await webTester.getTextValueFromElement(tokenSelectionPage.tokensCaption())).to.equal(
      await t('browserView.sideMenu.links.tokens')
    );
    await expect(await webTester.getTextValueFromElement(tokenSelectionPage.nftsCaption())).to.equal(
      await t('browserView.sideMenu.links.nfts')
    );
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
