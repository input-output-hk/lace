import { TokensPage } from '../elements/tokensPage';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';

class TokensPageObject {
  async clickTokenWithName(tokenName: string) {
    await new TokensPage().tokensTableItemWithName(tokenName).click();
  }

  async waitUntilHeadersLoaded() {
    await new TokensPage().title.waitForDisplayed({ timeout: 30_000 });
    await new TokensPage().title.waitForDisplayed({ timeout: 30_000 });
  }

  async waitUntilCardanoTokenLoaded() {
    const selector = 'p=Cardano';
    await $(selector).waitForDisplayed({ timeout: 30_000 });
  }

  async saveTokenBalance(tokenName: string, mode: 'extended' | 'popup') {
    const tokensPage = new TokensPage();
    const rowIndex = await tokensPage.getTokenRowIndex(tokenName);
    const tokenBalance = await tokensPage.getTokenTableItemValueByIndex(rowIndex, mode);
    testContext.save(`${Asset.getByName(tokenName).ticker}tokenBalance`, tokenBalance);
  }

  async clickOnCoinGeckoCreditsLink() {
    await new TokensPage().coinGeckoLink.click();
  }
}

export default new TokensPageObject();
