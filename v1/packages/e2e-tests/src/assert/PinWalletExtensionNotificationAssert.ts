import PinWalletExtensionNotification from '../elements/PinWalletExtensionNotification';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class PinWalletExtensionNotificationAssert {
  async assertSeeNotification(): Promise<void> {
    await PinWalletExtensionNotification.component.waitForDisplayed();
    await PinWalletExtensionNotification.logo.waitForDisplayed();
    await PinWalletExtensionNotification.title.waitForDisplayed();
    expect(await PinWalletExtensionNotification.title.getText()).to.equal(await t('browserView.pinExtension.title'));
    await PinWalletExtensionNotification.prompt.waitForDisplayed();
    const expectedPrompt = (await t('browserView.pinExtension.prompt')).replace('<icon/>', '').replace(/\s{2,}/g, ' ');
    const actualPromptText = (await PinWalletExtensionNotification.prompt.getText()).replace('\n', ' ');
    expect(actualPromptText).to.equal(expectedPrompt);
    await PinWalletExtensionNotification.icon.waitForDisplayed();
  }

  async assertDoNotSeeNotificationAfter(seconds: number): Promise<void> {
    await browser.pause(seconds * 1000);
    await PinWalletExtensionNotification.component.waitForDisplayed({ reverse: true });
  }
}

export default new PinWalletExtensionNotificationAssert();
