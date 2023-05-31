/* eslint-disable no-magic-numbers */
/* eslint-disable new-cap */
import { Then, When } from '@cucumber/cucumber';
import stakingPageAssert from '../assert/stakingPageAssert';
import stakingPopupPageObject from '../pageobject/stakingPopupPageObject';
import testContext from '../utils/testContext';

Then(/^I see stake pool search control with appropriate content$/, async () => {
  await stakingPageAssert.assertSeePopupSearch();
});

Then(/^I input "([^"]*)" to search bar$/, async (term: string) => {
  await (term === 'OtherStakePool' || term === 'OtherNoMetadataStakePool'
    ? stakingPopupPageObject.fillSearch(testContext.load(term))
    : stakingPopupPageObject.fillSearch(term));
});

When(/^I click stake pool with the name "([^"]*)"$/, async (poolName: string) => {
  poolName === 'OtherStakePool'
    ? await stakingPopupPageObject.clickStakepoolWithName(testContext.load(poolName))
    : await stakingPopupPageObject.clickStakepoolWithName(poolName);
});
When(/^I wait for single search result$/, async () => {
  await stakingPageAssert.assertSeeSingleSearchResult();
});
