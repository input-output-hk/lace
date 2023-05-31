import { When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import { DrawerCommonExtended } from '../elements/drawerCommonExtended';
import Modal from '../elements/modal';
import { t } from '../utils/translationService';
import buttonAssert from '../assert/buttonAssert';

When(/click "([^"]*)?" button$/, async (value: string) => {
  await webTester.clickButton((await t(value)) ?? value);
});

When(/I click "([^"]*)?" button with custom timeout (\d*)$/, async (value: string, customTimeout: number) => {
  await webTester.clickButton((await t(value)) ?? value, customTimeout);
});

When(/click "([^"]*)?" button in drawer$/, async (value: string) => {
  await webTester.clickElement(new DrawerCommonExtended().drawerButton(await t(value)));
});

When(/click "([^"]*)?" button in modal$/, async (value: string) => {
  await Modal.container.waitForDisplayed();
  await Modal.buttonWithText(await t(value)).click();
});

When(/^I (see|do not see) "([^"]*)?" button$/, async (shouldSee: 'see' | 'do not see', value: string) => {
  await buttonAssert.assertSeeButtonWithText(shouldSee === 'see', value);
});
