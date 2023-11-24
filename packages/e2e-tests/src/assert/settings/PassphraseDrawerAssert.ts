import PassphraseDrawer from '../../elements/settings/PassphraseDrawer';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { t } from '../../utils/translationService';

class PassphraseDrawerAssert {
  async assertSeeDrawerTitle(expectedTitle: string) {
    const drawerTitle = await PassphraseDrawer.drawerHeaderTitle;
    await drawerTitle.waitForDisplayed();
    await browser.waitUntil(async () => (await drawerTitle.getText()) === expectedTitle, {
      timeoutMsg: `failed while waiting for drawer title: ${expectedTitle}`
    });
  }

  async assertSeePassphraseDescription(expectedDescription: string) {
    const passphraseDescription = await PassphraseDrawer.description;
    await passphraseDescription.waitForDisplayed();
    expect(await passphraseDescription.getText()).to.equal(expectedDescription);
  }

  async assertSeeBannerIcon() {
    await PassphraseDrawer.bannerIcon.waitForDisplayed();
  }

  async assertSeeBannerDescription(expectedText: string) {
    await PassphraseDrawer.bannerDescription.waitForDisplayed();
    expect(await PassphraseDrawer.bannerDescription.getText()).to.equal(expectedText);
  }

  async assertSeePasswordInputContainer() {
    await PassphraseDrawer.passwordInputContainer.waitForDisplayed();
  }

  async assertSeeShowPassphraseButton(shouldBeDisplayed: boolean) {
    await PassphraseDrawer.showPassphraseButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await PassphraseDrawer.showPassphraseButton.getText()).to.equal(
        await t('browserView.settings.security.showPassphraseDrawer.showPassphrase')
      );
    }
  }

  async assertSeeHidePassphraseButton() {
    const hidePassphraseButton = await PassphraseDrawer.hidePassphraseButton;
    await hidePassphraseButton.waitForDisplayed();
    expect(await hidePassphraseButton.getText()).to.equal(
      await t('browserView.settings.security.showPassphraseDrawer.hidePassphrase')
    );
  }

  async assertShowPassphraseButtonEnabled(shouldBeEnabled: boolean) {
    await PassphraseDrawer.showPassphraseButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertHidePassphraseButtonEnabled(shouldBeEnabled: boolean) {
    await PassphraseDrawer.hidePassphraseButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertAllMnemonicsAreListed(expectedMnemonics: string[]) {
    const mnemonicWordWritedowns = await PassphraseDrawer.mnemonicWordWritedowns;

    for (const mnemonicWordWritedown of mnemonicWordWritedowns) {
      const actualMnemonic = await mnemonicWordWritedown.getText();
      const expectedMnemonic = expectedMnemonics[mnemonicWordWritedowns.indexOf(mnemonicWordWritedown)];
      await mnemonicWordWritedown.waitForDisplayed();
      expect(actualMnemonic).to.equal(expectedMnemonic);
    }
  }

  async assertAllMnemonicsAreBlurred(reverse: boolean) {
    const mnemonicWordContainers = await PassphraseDrawer.mnemonicWordContainers;

    for (const mnemonicWordContainer of mnemonicWordContainers) {
      reverse
        ? expect(await mnemonicWordContainer.getAttribute('class')).to.not.contain('blur')
        : expect(await mnemonicWordContainer.getAttribute('class')).to.contain('blur');
    }
  }
}

export default new PassphraseDrawerAssert();
