import { Given, When, Then } from '@cucumber/cucumber';
import midnightBanner from '../elements/midnightBanner';
import midnightBannerAssert from '../assert/midnightBannerAssert';
import { switchToLastWindow } from '../utils/window';

Given(
  /^"Discover the Midnight Token Distribution" banner (is|is not) displayed$/,
  async (shouldBeDisplayed: 'is' | 'is not') => {
    await midnightBannerAssert.assertSeeMidnightBanner(shouldBeDisplayed === 'is');
  }
);

When(
  /^I click on "(Learn more|Remind me later|Close)" button on "Discover the Midnight Token Distribution" banner$/,
  async (button: 'Learn more' | 'Remind me later'| 'Close') => {
    switch (button) {
      case 'Learn more':
        await midnightBanner.clickOnLearnMoreButton();
        break;
      case 'Remind me later':
        await midnightBanner.clickOnRemindMeLaterButton();
        break;
      case 'Close':
        await midnightBanner.clickOnCloseButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(/^"www.midnight.gd" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await midnightBannerAssert.assertSeeMidnightURL();
});
