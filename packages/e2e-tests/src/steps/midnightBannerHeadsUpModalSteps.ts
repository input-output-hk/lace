import { When, Then } from '@cucumber/cucumber';
import midnightBannerHeadsUpModalAssert from '../assert/midnightBannerHeadsUpModalAssert';
import midnightBannerHeadsUpModal from '../elements/midnightBannerHeadsUpModal';

When(/^I click on "Cancel" button on "Heads up" modal$/, async () => {
  await midnightBannerHeadsUpModal.clickOnCancelButton();
});

Then(/^I see "Heads up" modal$/, async () => {
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalTitle();
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalDescription();
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalButtons();
});
