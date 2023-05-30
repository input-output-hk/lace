import { TokenDetailsPage } from '../elements/tokenDetailsPage';
import webTester from '../actor/webTester';
import { Button } from '../elements/button';
import { t } from '../utils/translationService';
import { Asset } from '../data/Asset';
import { expect } from 'chai';

class TokenDetailsAssert {
  async assertSeeTokenDetailsPageForToken(tokenName: string, tokenTicker: string, mode: 'extended' | 'popup') {
    const tokenDetailsPage = new TokenDetailsPage();
    await webTester.waitUntilSeeElement(tokenDetailsPage.tokenLogo(), 20_000);
    expect(await tokenDetailsPage.getTokenName()).to.equal(tokenName);
    expect(await tokenDetailsPage.getTokenTicker()).to.equal(tokenTicker);

    const expectedTokenPriceLabel =
      mode === 'extended' ? await t('browserView.assetDetails.assetPrice') : await t('browserView.assetDetails.price');
    expect(await tokenDetailsPage.getTokenPriceLabel()).to.equal(expectedTokenPriceLabel);
    await webTester.seeWebElement(tokenDetailsPage.tokenPriceValue());

    if (tokenName === Asset.CARDANO.name) {
      expect(await tokenDetailsPage.getTokenPriceCurrency()).to.equal('USD');
    }

    await webTester.seeWebElement(tokenDetailsPage.tokenPriceChange());

    expect(await tokenDetailsPage.getTokenBalanceLabel()).to.equal(await t('browserView.assetDetails.assetBalance'));
    await webTester.seeWebElement(tokenDetailsPage.tokenBalanceValue());
    expect(await tokenDetailsPage.getTokenBalanceCurrency()).to.equal(tokenTicker);
    await webTester.seeWebElement(tokenDetailsPage.tokenBalanceTotal());

    expect(await tokenDetailsPage.getTransactionsListTitle()).to.equal(
      await t('browserView.assetDetails.recentTransactions')
    );
    const transactions = await tokenDetailsPage.getTransactionsListItems();
    expect(transactions.length).to.be.greaterThan(0);
    if (mode === 'extended') {
      expect(transactions.length).to.be.lessThanOrEqual(10);
      await webTester.seeWebElement(new Button(await t('browserView.assetDetails.viewAll')));
    }
    if (mode === 'popup') {
      expect(transactions.length).to.be.lessThanOrEqual(3);
      await webTester.seeWebElement(tokenDetailsPage.seeAllTransactionsButton());
    }
  }
}

export default new TokenDetailsAssert();
