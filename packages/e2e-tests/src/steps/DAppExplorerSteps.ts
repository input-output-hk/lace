import { Then, When } from '@cucumber/cucumber';
import DAppExplorerPageAssert from '../assert/DAppExplorer/DAppExplorerPageAssert';
import DAppExplorerPage from '../elements/DAppExplorer/DAppExplorerPage';

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
  await DAppExplorerPageAssert.seeDAppCards();
});
