import { expect } from 'chai';
import { t } from '../../utils/translationService';
import MessageSigningSignConfirmationDrawer from '../../elements/settings/MessageSigningConfirmationDrawer';

class MessageSigningConfirmationDrawerAssert {
  async assertSeeSignConfirmationDrawer() {
    await MessageSigningSignConfirmationDrawer.drawerHeaderCloseButton.waitForClickable();
    await MessageSigningSignConfirmationDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await MessageSigningSignConfirmationDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('core.signMessage.title')
    );

    await MessageSigningSignConfirmationDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await MessageSigningSignConfirmationDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('core.signMessage.passwordTitle')
    );
    await MessageSigningSignConfirmationDrawer.drawerHeaderSubtitle.waitForDisplayed();
    expect(await MessageSigningSignConfirmationDrawer.drawerHeaderSubtitle.getText()).to.equal(
      await t('core.signMessage.passwordSubtitle')
    );

    await MessageSigningSignConfirmationDrawer.passwordInput.waitForEnabled();

    await MessageSigningSignConfirmationDrawer.signMessageButton.waitForEnabled();
    expect(await MessageSigningSignConfirmationDrawer.signMessageButton.getText()).to.equal(
      await t('core.signMessage.signButton')
    );

    await MessageSigningSignConfirmationDrawer.closeButton.waitForDisplayed();
    expect(await MessageSigningSignConfirmationDrawer.closeButton.getText()).to.equal(
      await t('core.signMessage.closeButton')
    );
  }
}

export default new MessageSigningConfirmationDrawerAssert();
