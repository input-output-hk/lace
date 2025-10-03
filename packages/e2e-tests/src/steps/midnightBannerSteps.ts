import { Given, When, Then } from '@cucumber/cucumber';
import midnightBanner from '../elements/midnightBanner';
import midnightBannerAssert from '../assert/midnightBannerAssert';
import { switchToLastWindow } from '../utils/window';

Given(/^"Discover the Midnight Token Distribution" banner is displayed$/, async () => {
  await midnightBannerAssert.assertSeeMidnightBanner();
});

When(/^I click on "Learn more" button on "Discover the Midnight Token Distribution" banner$/, async () => {
  await midnightBanner.clickOnLearnMoreButton();
});

Then(/^"www.midnight.gd" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await midnightBannerAssert.assertSeeMidnightURL();
});
