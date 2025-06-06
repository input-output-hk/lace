import { Then, When } from '@cucumber/cucumber';
import educationalListAssert from '../assert/educationalListAssert';
import VotingCenterPageAssert from '../assert/VotingCenterPageAssert';
import VotingCenterPage from '../elements/VotingCenterPage';

Then(/^I see "Voting Center" banner$/, async () => {
  await VotingCenterPageAssert.assertSeeVotingCenterBanner();
});

Then(/^I see "Learn about" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeVotingWidget();
});

When(/^I click on "Access tempo.vote" button$/, async () => {
  await VotingCenterPage.clickOnGovToolButton();
});
