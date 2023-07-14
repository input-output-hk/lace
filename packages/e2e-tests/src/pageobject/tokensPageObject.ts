import TokensPage from '../elements/tokensPage';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';

class TokensPageObject {
  async clickTokenWithName(tokenName: string) {
    await TokensPage.tokensTableItemWithName(tokenName).click();
  }

  async waitUntilHeadersLoaded() {
    await TokensPage.title.waitForDisplayed({ timeout: 30_000 });
    await TokensPage.totalBalanceLabel.waitForDisplayed({ timeout: 30_000 });
  }

  async waitUntilCardanoTokenLoaded() {
    const selector = 'p=Cardano';
    await $(selector).waitForDisplayed({ timeout: 30_000 });
  }

  async saveTokenBalance(tokenName: string) {
    const rowIndex = await TokensPage.getTokenRowIndex(tokenName);
    const tokenBalance = await TokensPage.getTokenBalanceAsFloatByIndex(rowIndex);
    testContext.save(`${Asset.getByName(tokenName)?.ticker}tokenBalance`, tokenBalance);
  }

  async loadTokenBalance(tokenName: string) {
    return testContext.load(`${Asset.getByName(tokenName)?.ticker}tokenBalance`);
  }

  async clickOnCoinGeckoCreditsLink() {
    await TokensPage.coinGeckoLink.click();
  }
}

export default new TokensPageObject();
