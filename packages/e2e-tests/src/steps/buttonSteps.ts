import { When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import { t } from '../utils/translationService';

When(/click "([^"]*)?" button$/, async (value: string) => {
  await webTester.clickButton((await t(value)) ?? value);
});
