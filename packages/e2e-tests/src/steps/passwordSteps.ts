import { When, Then } from '@cucumber/cucumber';
import simpleTxSideDrawerPageObject from '../pageobject/simpleTxSideDrawerPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import passwordInputAssert from '../assert/passwordInputAssert';
import PasswordInput from '../elements/passwordInput';
import { t } from '../utils/translationService';

Then(/^I fill (correct|incorrect) password and confirm$/, async (type: string) => {
  const password = type === 'correct' ? getTestWallet(TestWalletName.TestAutomationWallet).password : 'somePassword';
  await simpleTxSideDrawerPageObject.fillPasswordAndConfirm(password);
});

Then(/^I fill (correct|incorrect) password$/, async (type: string) => {
  const password = type === 'correct' ? getTestWallet(TestWalletName.TestAutomationWallet).password : 'somePassword';
  await simpleTxSideDrawerPageObject.fillPassword(password);
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
