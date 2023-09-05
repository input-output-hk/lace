import { Given, Then } from '@cucumber/cucumber';
import MultidelegationPageAssert from '../assert/multidelegationPageAssert';
import MultidelegationPage from '../elements/staking/MultidelegationPage';

Given(/^I click (Overview|Browse pools) tab$/, async (tabToClick: 'Overview' | 'Browse pools') => {
  await MultidelegationPage.clickOnTab(tabToClick);
});

Then(/^I wait until delegation info card shows staking to "(\d+)" pool\(s\)$/, async (poolsCount: number) => {
  await MultidelegationPageAssert.assertSeeStakingOnPoolsCounter(poolsCount);
});

Then(
  /^I pick "(\d+)" pools for delegation from browse pools view: "([^"]*)"$/,
  async (_ignored: number, poolsToStake: string) => {
    await MultidelegationPage.markPoolsForDelegation(poolsToStake);
  }
);

Then(/^I click "Next" button on staking (portfolio bar|manage staking|confirmation)$/, async (section: string) => {
  await MultidelegationPage.clickButtonOnSection(section);
});
Given(/^I confirm multidelegation beta modal$/, async () => {
  await MultidelegationPage.confirmBetaModal();
});

Then(/^I see Delegation card displaying correct data$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegationCardDetailsInfo();
});

Then(/^I see Delegation title displayed for multidelegation$/, async () => {
  await MultidelegationPageAssert.assertSeeTitle();
});

Then(/^I see Delegation pool cards are displayed for (popup|extended) view$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegatedPoolCardsPopup();
});
