import { Button } from '../elements/button';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';
import { expect } from 'chai';

class ButtonAssert {
  async assertButtonIsEnabled(text: string, enabled: boolean) {
    Logger.log(`Waiting for button with text: ${text} to be enabled: ${enabled}`);
    const button = await $(new Button(text).toJSLocator());
    await button.waitForDisplayed();
    await button.waitForClickable({ reverse: !enabled });
  }

  async assertSeeButtonWithText(shouldSee: boolean, buttonText: string) {
    const buttonLocator = new Button(await t(buttonText)).toJSLocator();
    const isDisplayed = await $(buttonLocator).isDisplayedInViewport();
    expect(isDisplayed).to.equal(shouldSee);
  }
}

export default new ButtonAssert();
