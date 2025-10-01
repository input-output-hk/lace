import { Given, When } from '@cucumber/cucumber';
import midnightPopup from '../elements/midnightBanner';

Given(/^"Discover the Midnight Token Distribution" banner is displayed$/, async () => {
  await midnightPopup.clickOnLearnMoreButton();
});

When(/^I click on "Learn more" button on "Discover the Midnight Token Distribution" banner$/, async () => {
  await midnightPopup.clickOnLearnMoreButton();
});
