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

    await MessageSigningAllDoneDrawer.signature.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.signature.getText()).to.not.be.empty;

    await MessageSigningAllDoneDrawer.signatureLabel.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.signatureLabel.getText()).to.not.be.empty;

    await MessageSigningAllDoneDrawer.signatureCopyToClipboardButton.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.signatureCopyToClipboardButton.getText()).to.equal(
      await t('core.signMessage.copyToClipboard')
    );

    await MessageSigningAllDoneDrawer.key.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.key.getText()).to.not.be.empty;

    await MessageSigningAllDoneDrawer.keyCopyToClipboardButton.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.keyCopyToClipboardButton.getText()).to.equal(
      await t('core.signMessage.copyToClipboard')
    );

    await MessageSigningAllDoneDrawer.keyLabel.waitForDisplayed();
    expect(await MessageSigningAllDoneDrawer.keyLabel.getText()).to.not.be.empty;

    await MessageSigningAllDoneDrawer.signAnotherMessageButton.waitForClickable();
    expect(await MessageSigningAllDoneDrawer.signAnotherMessageButton.getText()).to.equal(
      await t('core.signMessage.signAnotherMessage')
    );
    await MessageSigningAllDoneDrawer.closeButton.waitForClickable();
    expect(await MessageSigningAllDoneDrawer.closeButton.getText()).to.equal(await t('core.signMessage.closeButton'));
  }

  async assertSignatureInClipboardIsCorrect() {
    const displayedSignature = await MessageSigningAllDoneDrawer.signature.getText();
    const signatureFromClipboard = await clipboard.read();
    expect(signatureFromClipboard).to.equal(displayedSignature);
  }

  async assertPublicKeyInClipboardIsCorrect() {
    const displayedPublicKey = await MessageSigningAllDoneDrawer.key.getText();
    const publicKeyFromClipboard = await clipboard.read();
    expect(publicKeyFromClipboard).to.equal(displayedPublicKey);
  }
}

export default new MessageSigningAllDoneDrawerAssert();
