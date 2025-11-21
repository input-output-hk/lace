import { Then, When } from '@cucumber/cucumber';
import DAppExplorerPageAssert from '../assert/DAppExplorer/DAppExplorerPageAssert';
import DAppExplorerPage from '../elements/DAppExplorer/DAppExplorerPage';
import { DAppCategories } from '../types/dappCategories';
import { DAppCard } from '../elements/DAppExplorer/DAppCard';
import DAppInfoDrawer from '../elements/DAppExplorer/DAppInfoDrawer';
import DAppInfoDrawerAssert from '../assert/DAppExplorer/DAppInfoDrawerAssert';

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

When(/^I click on "([^"]*)" DApp card$/, async (dappName: string) => {
  const dapp = new DAppCard(dappName);
  await dapp.container.waitForClickable();
  await dapp.container.click();
});

Then(/^"([^"]*)" DApp details drawer is displayed$/, async (dappName: string) => {
  await DAppInfoDrawerAssert.assertSeeDAppInfoDrawer(dappName);
});

When(/^I click on DApp URL button$/, async () => {
  await DAppInfoDrawer.dappOpenButton.waitForClickable();
  await DAppInfoDrawer.dappOpenButton.click();
});
