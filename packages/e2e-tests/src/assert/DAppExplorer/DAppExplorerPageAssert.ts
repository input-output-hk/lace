import DAppExplorerPage from '../../elements/DAppExplorer/DAppExplorerPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { getAllDAppNamesFromLocalStorage, getDAppNamesFromLocalStorageByCategory } from '../../utils/DAppsUtils';
import { DAppCard } from '../../elements/DAppExplorer/DAppCard';
import type { DAppCategories } from '../../types/dappCategories';

class DAppExplorerPageAssert {
  async assertSeePageTitle(category: DAppCategories | 'Show All') {
    let title;
    switch (category) {
      case 'Show All':
        title = 'All DApps'; // Hardcoded values, no translations implemented
        break;
      case 'Games':
      case 'Defi':
      case 'Collectibles':
      case 'Marketplaces':
      case 'Exchanges':
      case 'Social':
      case 'Other':
        title = category;
        break;
      default:
        throw new Error(`Unsupported category: ${category}`);
    }
    await DAppExplorerPage.pageTitle.waitForDisplayed();
    expect(await DAppExplorerPage.pageTitle.getText()).to.equal(title);
  }

  async assertSeeDAppExplorerPage(): Promise<void> {
    await this.assertSeePageTitle('Show All');
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

  async assertSeeDAppCards(category: DAppCategories | 'Show All') {
    await browser.waitUntil(() => browser.execute(() => document.readyState === 'complete'), {
      timeout: 5000,
      timeoutMsg: 'Page did not load within the given time'
    });
    await DAppExplorerPage.skeleton.waitForDisplayed({ reverse: true });
    const dappNamesFromLocalStorage =
      category === 'Show All'
        ? await getAllDAppNamesFromLocalStorage()
        : await getDAppNamesFromLocalStorageByCategory(category);
    expect(dappNamesFromLocalStorage.length).to.be.greaterThan(0);
    expect(dappNamesFromLocalStorage.length).to.be.lessThanOrEqual(30);
    const displayedDApps = await DAppExplorerPage.dappCards;
    expect(displayedDApps.length).to.equal(dappNamesFromLocalStorage.length);
    for (const dappName of dappNamesFromLocalStorage) {
      const dappCard = new DAppCard(dappName);
      await dappCard.container.scrollIntoView();
      await dappCard.container.waitForDisplayed();
      await dappCard.icon.waitForDisplayed();
      await dappCard.title.waitForDisplayed();
      await dappCard.category.waitForDisplayed();
      if (category !== 'Show All') {
        expect(await dappCard.category.getText()).to.equal(category);
      }
    }
  }

  async assertSeeNoDAppsMessage() {
    await DAppExplorerPage.emptyStateImage.waitForDisplayed();
    await DAppExplorerPage.emptyStateHeader.waitForDisplayed();
    expect(await DAppExplorerPage.emptyStateHeader.getText()).to.equal(
      await t('dappdiscovery.empty_state.no_dapps_title')
    );
    await DAppExplorerPage.emptyStateText.waitForDisplayed();
    expect(await DAppExplorerPage.emptyStateText.getText()).to.equal(
      await t('dappdiscovery.empty_state.no_dapps_content1')
    );
    await DAppExplorerPage.emptyStateText2.waitForDisplayed();
    expect(await DAppExplorerPage.emptyStateText2.getText()).to.equal(
      await t('dappdiscovery.empty_state.no_dapps_content2')
    );
  }
}

export default new DAppExplorerPageAssert();
