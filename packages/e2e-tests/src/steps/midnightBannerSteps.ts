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

When(/^I click on "(.*)" button on "Discover the Midnight Token Distribution" banner$/, async (buttonLabel: string) => {
  const actions: Record<string, () => Promise<void>> = {
    'Learn more': async () => midnightBanner.clickOnLearnMoreButton(),
    'Remind me later': async () => midnightBanner.clickOnRemindMeLaterButton()
  };

  const action = actions[buttonLabel];
  if (!action) throw new Error(`Button "${buttonLabel}" not found on midnight banner`);
  await action();
});

Then(/^"www.midnight.gd" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await midnightBannerAssert.assertSeeMidnightURL();
});
