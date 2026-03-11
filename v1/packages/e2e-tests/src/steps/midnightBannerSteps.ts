import { Given, When, Then } from '@cucumber/cucumber';
import midnightBanner from '../elements/midnightBanner';
import midnightBannerAssert from '../assert/midnightBannerAssert';
import { switchToLastWindow } from '../utils/window';

Given(/^"Get started with Midnight" banner (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await midnightBannerAssert.assertSeeMidnightBanner(shouldBeDisplayed === 'is');
});

When(
  /^I click on "(Midnight Registration|Close)" button on "Get started with Midnight" banner$/,
  async (button: 'Midnight Registration' | 'Close') => {
    switch (button) {
      case 'Midnight Registration':
        await midnightBanner.clickOnMidnightRegistrationButton();
        break;
      case 'Close':
        await midnightBanner.clickOnCloseButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(/^"Dust Generation DApp" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await midnightBannerAssert.assertSeeDustGenerationDApp();
});
