import { When, Then } from '@cucumber/cucumber';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import passwordInputAssert from '../assert/passwordInputAssert';
import PasswordInput from '../elements/passwordInput';
import { t } from '../utils/translationService';

Then(/^I fill (correct|incorrect) password$/, async (type: string) => {
  const password =
    type === 'correct' ? String(getTestWallet(TestWalletName.TestAutomationWallet).password) : 'somePassword';
  await PasswordInput.input.setValue(password);
});

Then(/^Password field value is hidden$/, async () => {
  await passwordInputAssert.assertPasswordFieldValueIsHidden();
});

Then(/^Password field is displayed with value "([^"]*)"$/, async (expectedValue: string) => {
  await passwordInputAssert.assertPasswordFieldValueIsDisplayed(expectedValue);
});

Then(/^Password field is empty$/, async () => {
  await passwordInputAssert.assertPasswordFieldValueIsEmpty();
});

When(/^I click show password button$/, async () => {
  await PasswordInput.passwordShowButton.click();
});

When(/^I see "([^"]*)" password error$/, async (expectedError: string) => {
  await passwordInputAssert.assertSeePasswordInputError(await t(expectedError));
});
