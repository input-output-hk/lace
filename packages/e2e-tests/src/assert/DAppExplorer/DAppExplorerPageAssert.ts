import DAppExplorerPage from '../../elements/DAppExplorer/DAppExplorerPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class DAppExplorerPageAssert {
  async assertSeeDAppExplorerPage(): Promise<void> {
    await DAppExplorerPage.pageTitle.waitForDisplayed();
    expect(await DAppExplorerPage.pageTitle.getText()).to.equal('All DApps'); // Hardcoded values, no translations implemented
    await DAppExplorerPage.infoIcon.waitForDisplayed();
  }

  async assertSeeTooltip() {
    await DAppExplorerPage.infoTooltip.waitForDisplayed();
    const expectedTooltipText = (await t('dappdiscovery.general_info')).replaceAll(/<[^>]*>?/gm, '');
    const actualText = (await DAppExplorerPage.infoTooltip.getText()).replaceAll('\n', '');
    expect(actualText).to.equal(expectedTooltipText);
  }

  async assertSeeCategories() {
    await DAppExplorerPage.categoryShowAll.scrollIntoView();
    await DAppExplorerPage.categoryShowAll.waitForDisplayed();
    expect(await DAppExplorerPage.categoryShowAll.getText()).to.equal('Show All');
    await DAppExplorerPage.categoryGames.scrollIntoView();
    await DAppExplorerPage.categoryGames.waitForDisplayed();
    expect(await DAppExplorerPage.categoryGames.getText()).to.equal('Games');
    await DAppExplorerPage.categoryDefi.scrollIntoView();
    await DAppExplorerPage.categoryDefi.waitForDisplayed();
    expect(await DAppExplorerPage.categoryDefi.getText()).to.equal('Defi');
    await DAppExplorerPage.categoryCollectibles.waitForDisplayed();
    await DAppExplorerPage.categoryCollectibles.waitForDisplayed();
    expect(await DAppExplorerPage.categoryCollectibles.getText()).to.equal('Collectibles');
    await DAppExplorerPage.categoryMarketplaces.scrollIntoView();
    await DAppExplorerPage.categoryMarketplaces.waitForDisplayed();
    expect(await DAppExplorerPage.categoryMarketplaces.getText()).to.equal('Marketplaces');
    await DAppExplorerPage.categoryExchanges.scrollIntoView();
    await DAppExplorerPage.categoryExchanges.waitForDisplayed();
    expect(await DAppExplorerPage.categoryExchanges.getText()).to.equal('Exchanges');
    await DAppExplorerPage.categorySocial.scrollIntoView();
    await DAppExplorerPage.categorySocial.waitForDisplayed();
    expect(await DAppExplorerPage.categorySocial.getText()).to.equal('Social');
    await DAppExplorerPage.categoryOther.scrollIntoView();
    await DAppExplorerPage.categoryOther.waitForDisplayed();
    expect(await DAppExplorerPage.categoryOther.getText()).to.equal('Other');
  }

  async seeDAppCards() {
    await browser.pause(1000);
    await DAppExplorerPage.skeleton.waitForDisplayed({ reverse: true });
    const cards = await DAppExplorerPage.dappCards;
    for (const card of cards) {
      await card.waitForDisplayed();
      // TODO: add more detailed verification
    }
  }
}

export default new DAppExplorerPageAssert();
