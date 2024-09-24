import MessageSigningInputDrawer from '../../elements/settings/MessageSigningInputDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class MessageSigningInputDrawerAssert {
  async assertSeeMessageSigningInputDrawer() {
    await MessageSigningInputDrawer.drawerHeaderCloseButton.waitForClickable();
    await MessageSigningInputDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await MessageSigningInputDrawer.drawerNavigationTitle.getText()).to.equal(await t('core.signMessage.title'));

    await MessageSigningInputDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await MessageSigningInputDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('core.signMessage.instructions')
    );
    await MessageSigningInputDrawer.drawerHeaderSubtitle.waitForDisplayed();
    expect(await MessageSigningInputDrawer.drawerHeaderSubtitle.getText()).to.equal(
      await t('core.signMessage.subtitle')
    );

    await MessageSigningInputDrawer.addressLabel.waitForDisplayed();
    expect(await MessageSigningInputDrawer.addressLabel.getText()).to.equal(await t('core.signMessage.addressLabel'));
    await MessageSigningInputDrawer.selectAddressButton.waitForDisplayed();
    expect(await MessageSigningInputDrawer.selectAddressButton.getText()).to.equal(
      await t('core.signMessage.selectAddress')
    );

    await MessageSigningInputDrawer.messageToSignLabel.waitForDisplayed();
    expect(await MessageSigningInputDrawer.messageToSignLabel.getText()).to.equal(
      await t('core.signMessage.messageLabel')
    );
    await MessageSigningInputDrawer.messageInput.waitForDisplayed();
    expect(await MessageSigningInputDrawer.messageInput.getAttribute('placeholder')).to.equal(
      await t('core.signMessage.messagePlaceholder')
    );

    await MessageSigningInputDrawer.signMessageButton.waitForDisplayed();
    expect(await MessageSigningInputDrawer.signMessageButton.getText()).to.equal(
      await t('core.signMessage.signButton')
    );

    await MessageSigningInputDrawer.closeButton.waitForDisplayed();
    expect(await MessageSigningInputDrawer.closeButton.getText()).to.equal(await t('core.signMessage.closeButton'));
  }

  async assertSeeFollowingAddressesOnTheDropdownMenu(expectedAddresses: string[]) {
    await MessageSigningInputDrawer.addressMenu.waitForClickable();
    const actualAddresses = await (
      await MessageSigningInputDrawer.addresses
    ).map(async (address) => await address.getText());

    expect(actualAddresses).to.deep.equal(expectedAddresses);
  }

  async assertSeeSelectedAddress(expectedAddress: string) {
    await MessageSigningInputDrawer.selectAddressButton.waitForDisplayed();
    const actualAddress = await MessageSigningInputDrawer.selectAddressButton.getText();
    expect(actualAddress).to.equal(expectedAddress);
  }
}

export default new MessageSigningInputDrawerAssert();
