import { Then, When } from '@cucumber/cucumber';
import educationalListAssert from '../assert/educationalListAssert';
import VotingCenterPageAssert from '../assert/VotingCenterPageAssert';
import VotingCenterPage from '../elements/VotingCenterPage';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

Then(/^I see "Voting Center" banner$/, async () => {
  await VotingCenterPageAssert.assertSeeVotingCenterBanner();
});

Then(/^I see "Learn about" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeVotingWidget();
});

When(
  /^I click on "(Access Gov.tool|Access Tempo.vote)" button$/,
  async (button: 'Access Gov.tool' | 'Access Tempo.vote') => {
    await VotingCenterPage.clickOnButton(button);
  }
);

Then(/^I'm redirected to "Voting Center" page$/, async () => {
  expect(await browser.getUrl()).to.contain('/voting');
  await VotingCenterPageAssert.assertSeeVotingCenterBanner();
});
