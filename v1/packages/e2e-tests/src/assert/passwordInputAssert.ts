import PasswordInput from '../elements/passwordInput';
import { expect } from 'chai';

class PasswordInputAssert {
  async assertPasswordFieldValueIsHidden() {
    await PasswordInput.input.waitForDisplayed();
    expect(await PasswordInput.input.getAttribute('type')).to.equal('password');
    expect(await PasswordInput.input).to.not.haveOwnProperty('value');
  }

  async assertPasswordFieldValueIsDisplayed(expectedValue: string) {
    await PasswordInput.input.waitForDisplayed();
    expect(await PasswordInput.input.getValue()).to.equal(expectedValue);
  }

  async assertSeePasswordInputError(expectedErrorMsg: string) {
    await PasswordInput.error.waitForDisplayed();
    const error = await PasswordInput.error.getText();
    expect(error).to.equal(expectedErrorMsg);
  }

  async assertPasswordFieldValueIsEmpty() {
    const passwordInputValue = await PasswordInput.input.getValue();
    expect(passwordInputValue).to.be.empty;
  }
}

export default new PasswordInputAssert();
