import { Given, When } from '@cucumber/cucumber';
import midnightBanner from '../elements/midnightBanner';
import midnightBannerAssert from '../assert/midnightBannerAssert';

Given(/^"Discover the Midnight Token Distribution" banner is displayed$/, async () => {
  await midnightBannerAssert.assertSeeMidnightBanner();
});

When(/^I click on "Learn more" button on "Discover the Midnight Token Distribution" banner$/, async () => {
  await midnightBanner.clickOnLearnMoreButton();
});
