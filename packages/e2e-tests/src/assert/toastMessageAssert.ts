import ToastMessage from '../elements/toastMessage';
import { expect } from 'chai';

class ToastMessageAssert {
  async assertSeeToastMessage(expectedMessage: string, shouldBeDisplayed = true) {
    await ToastMessage.container.waitForDisplayed({ timeout: 10_000, reverse: !shouldBeDisplayed });
    await ToastMessage.icon.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await ToastMessage.progressBar.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await ToastMessage.closeButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await ToastMessage.messageText.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await ToastMessage.messageText.getText()).to.equal(expectedMessage);
    }
  }
}

export default new ToastMessageAssert();
