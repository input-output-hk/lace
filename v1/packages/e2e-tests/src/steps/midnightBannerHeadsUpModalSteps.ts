import { When, Then } from '@cucumber/cucumber';
import midnightBannerHeadsUpModalAssert from '../assert/midnightBannerHeadsUpModalAssert';
import midnightBannerHeadsUpModal from '../elements/midnightBannerHeadsUpModal';

When(/^I click on "(Cancel|I understand)" button on "Heads up" modal$/, async (button: 'Cancel' | 'I understand') => {
  switch (button) {
    case 'Cancel':
      await midnightBannerHeadsUpModal.clickOnCancelButton();
      break;
    case 'I understand':
      await midnightBannerHeadsUpModal.clickOnConfirmButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^I see "Heads up" modal$/, async () => {
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalTitle();
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalDescription();
  await midnightBannerHeadsUpModalAssert.assertSeeHeadsUpModalButtons();
});
