import MessageSigningAllDoneDrawer from '../../elements/settings/MessageSigningAllDoneDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import clipboard from 'clipboardy';

class MessageSigningAllDoneDrawerAssert {
  async assertSeeAllDoneDrawer() {
    await MessageSigningAllDoneDrawer.drawerHeaderCloseButton.waitForClickable();
    await MessageSigningAllDoneDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('core.signMessage.title')
    );

    await MessageSigningAllDoneDrawer.image.waitForDisplayed();
    await MessageSigningAllDoneDrawer.title.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.title.getText()).to.equal(await t('core.signMessage.successTitle'));
    await MessageSigningAllDoneDrawer.description.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.description.getText()).to.equal(
      await t('core.signMessage.successDescription')
    );
    await MessageSigningAllDoneDrawer.signature.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.signature.getText()).to.not.be.empty;

    await MessageSigningAllDoneDrawer.copyButton.waitForClickable();
    expect(await MessageSigningAllDoneDrawer.copyButton.getText()).to.equal(
      await t('core.signMessage.copyToClipboard')
    );
    await MessageSigningAllDoneDrawer.closeButton.waitForClickable();
    expect(await MessageSigningAllDoneDrawer.closeButton.getText()).to.equal(await t('core.signMessage.closeButton'));
  }

  async assertSignatureInClipboardIsCorrect() {
    const displayedSignature = await MessageSigningAllDoneDrawer.signature.getText();
    const signatureFromClipboard = await clipboard.read();
    expect(signatureFromClipboard).to.equal(displayedSignature);
  }
}

export default new MessageSigningAllDoneDrawerAssert();
