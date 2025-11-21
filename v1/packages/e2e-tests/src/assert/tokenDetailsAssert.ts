import TokenDetailsPage from '../elements/tokenDetailsPage';
import { t } from '../utils/translationService';
import { Asset } from '../data/Asset';
import { expect } from 'chai';

class TokenDetailsAssert {
  async assertSeeTokenDrawerNavigation(mode: 'extended' | 'popup') {
    await TokenDetailsPage.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      await TokenDetailsPage.drawerNavigationTitle.waitForStable();
      expect(await TokenDetailsPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.assetDetails.title')
      );
    }
    await TokenDetailsPage.drawerHeaderCloseButton.waitForClickable();
  }

  async assertsSeeTokenDetailsTitle(tokenName: string, tokenTicker: string) {
    await TokenDetailsPage.tokenLogo.waitForDisplayed({ timeout: 20_000 });
    await TokenDetailsPage.tokenName.waitForDisplayed();
    await TokenDetailsPage.tokenTicker.waitForDisplayed();
    expect(await TokenDetailsPage.tokenName.getText()).to.equal(tokenName);
    expect(await TokenDetailsPage.tokenTicker.getText()).to.equal(tokenTicker);
  }

  async assertSeeTokenPriceSection(tokenName: string, mode: 'extended' | 'popup') {
    await TokenDetailsPage.tokenPriceLabel.waitForDisplayed();
    const expectedTokenPriceLabel =
      mode === 'extended' ? await t('browserView.assetDetails.assetPrice') : await t('browserView.assetDetails.price');
    expect(await TokenDetailsPage.tokenPriceLabel.getText()).to.equal(expectedTokenPriceLabel);
    await TokenDetailsPage.tokenPriceValue.waitForDisplayed();

    if (tokenName === Asset.CARDANO.name) {
      await TokenDetailsPage.tokenPriceCurrency.waitForDisplayed();
      expect(await TokenDetailsPage.tokenPriceCurrency.getText()).to.equal('USD');
    }

    await TokenDetailsPage.tokenPriceChange.waitForDisplayed();
  }
  async assertSeeTokenBalanceSection(tokenTicker: string) {
    await TokenDetailsPage.tokenBalanceLabel.waitForDisplayed();
    expect(await TokenDetailsPage.tokenBalanceLabel.getText()).to.equal(
      await t('browserView.assetDetails.assetBalance')
    );
    await TokenDetailsPage.tokenBalanceValue.waitForDisplayed();
    await TokenDetailsPage.tokenBalanceCurrency.waitForDisplayed();
    expect(await TokenDetailsPage.tokenBalanceCurrency.getText()).to.equal(tokenTicker);
    await TokenDetailsPage.tokenFiatBalance.waitForDisplayed();
  }

  async assertSeeTokenTransactionsSection() {
    await TokenDetailsPage.transactionsListTitle.waitForDisplayed();
    expect(await TokenDetailsPage.transactionsListTitle.getText()).to.equal(
      await t('browserView.assetDetails.recentTransactions')
    );

    const transactions = await TokenDetailsPage.transactionsListItems;
    expect(transactions.length).to.be.greaterThan(0);
    expect(transactions.length).to.be.lessThanOrEqual(3);
    await TokenDetailsPage.viewAllButton.waitForDisplayed();
    expect(await TokenDetailsPage.viewAllButton.getText()).to.equal(await t('browserView.assetDetails.viewAll'));
  }

  async assertSeeTokenDetailsPageForToken(tokenName: string, tokenTicker: string, mode: 'extended' | 'popup') {
    await this.assertSeeTokenDrawerNavigation(mode);
    await this.assertsSeeTokenDetailsTitle(tokenName, tokenTicker);
    await this.assertSeeTokenPriceSection(tokenName, mode);
    await this.assertSeeTokenBalanceSection(tokenTicker);
    await this.assertSeeTokenTransactionsSection();
  }
}

export default new TokenDetailsAssert();
