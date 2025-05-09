/* eslint-disable no-undef */
import { When, Then } from '@cucumber/cucumber';
import menuMainAssert from '../assert/menuMainAssert';

When(/^I see main navigation with all items in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  await menuMainAssert.assertSeeMainMenu(mode);
});

Then(/^Each main navigation item contains icon and text$/, async () => {
  await menuMainAssert.assertSeeIconAndTextForEachMenuItemExtended();
});

Then(/^I do not see "Staking" section in side menu$/, async () => {
  await menuMainAssert.assertSeeStakingButton('extended', true);
});
