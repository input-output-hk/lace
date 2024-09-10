import ToastMessage from '../elements/toastMessage';
import { expect } from 'chai';
import { isPopupMode } from '../utils/pageUtils';

class ToastMessageAssert {
  async assertSeeToastMessage(expectedMessage: string, shouldBeDisplayed = true) {
    await ToastMessage.container.waitForDisplayed({ timeout: 10_000, reverse: !shouldBeDisplayed });
    await ToastMessage.icon.waitForDisplayed({ reverse: !shouldBeDisplayed });
    // TODO: temporary override for LW-11313, please update when ticket is resolved
    if (!(await isPopupMode())) {
      await ToastMessage.progressBar.waitForDisplayed({ reverse: !shouldBeDisplayed });
    }
    await ToastMessage.closeButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await ToastMessage.messageText.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await ToastMessage.messageText.getText()).to.equal(expectedMessage);
    }
  }
}

export default new ToastMessageAssert();
