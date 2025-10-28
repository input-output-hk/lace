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

When(/^I click on "Learn more" button on "Discover the Midnight Token Distribution" banner$/, async () => {
  await midnightBanner.clickOnLearnMoreButton();
});

When(/^I click on "Remind me later" button on "Discover the Midnight Token Distribution" banner$/, async () => {
  await midnightBanner.clickOnRemindMeLaterButton();
});

Then(/^"www.midnight.gd" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await midnightBannerAssert.assertSeeMidnightURL();
});
