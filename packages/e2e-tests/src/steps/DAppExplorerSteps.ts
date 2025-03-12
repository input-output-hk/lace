import { Then, When } from '@cucumber/cucumber';
import DAppExplorerPageAssert from '../assert/DAppExplorer/DAppExplorerPageAssert';
import DAppExplorerPage from '../elements/DAppExplorer/DAppExplorerPage';
import { DAppCategories } from '../types/dappCategories';

Then(/^I see DApp Explorer page$/, async () => {
  await DAppExplorerPageAssert.assertSeeDAppExplorerPage();
});

When(/^I hover over info icon on DApp Explorer page$/, async () => {
  await DAppExplorerPage.hoverOverInfoIcon();
});

Then(/^I see a tooltip with information about DApp Explorer$/, async () => {
  await DAppExplorerPageAssert.assertSeeTooltip();
});

Then(/^I see the list of categories on DApp Explorer page$/, async () => {
  await DAppExplorerPageAssert.assertSeeCategories();
});

Then(/^I see cards with DApps on DApp Explorer page$/, async () => {
  await DAppExplorerPageAssert.assertSeeDAppCards('Show All');
});

When(
  /^I click on "(Show All|Games|Defi|Collectibles|Marketplaces|Exchanges|Social|Other)" DApp category$/,
  async (category: DAppCategories | 'Show All') => {
    await DAppExplorerPage.clickOnCategoryButton(category);
  }
);

Then(
  /^DApps page label matches selected "(Show All|Games|Defi|Collectibles|Marketplaces|Exchanges|Social|Other)" category$/,
  async (category: DAppCategories | 'Show All') => {
    await DAppExplorerPageAssert.assertSeePageTitle(category);
  }
);

Then(
  /^only DApps matching "(Show All|Games|Defi|Collectibles|Marketplaces|Exchanges|Social|Other)" are displayed$/,
  async (category: DAppCategories | 'Show All') => {
    await DAppExplorerPageAssert.assertSeeDAppCards(category);
  }
);

Then(/^"No DApps available" message is displayed$/, async () => {
  await DAppExplorerPageAssert.assertSeeNoDAppsMessage();
});
