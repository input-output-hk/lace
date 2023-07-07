import NftsPage from '../elements/NFTs/nftsPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import NftFolderNameInput from '../elements/NFTs/nftFolderNameInput';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';

class NftCreateFolderAssert {
  async assertSeeCreateFolderButton(shouldSee: boolean, mode: 'extended' | 'popup') {
    await NftsPage.createFolderButton.waitForDisplayed({ reverse: !shouldSee });
    if (mode === 'extended' && shouldSee === true) {
      await expect(await NftsPage.createFolderButton.getText()).to.equal(await t('browserView.nfts.createFolder'));
    }
  }

  async assertSeeCreateFolderPageDrawerNavigation(mode: 'extended' | 'popup') {
    if (mode === 'popup') {
      await NftCreateFolderPage.drawerHeaderBackButton.waitForDisplayed();
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed();
      await NftCreateFolderPage.drawerNavigationTitle.waitForDisplayed();
      await NftCreateFolderPage.drawerNavigationTitle.scrollIntoView();
      await expect(await NftCreateFolderPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.header')
      );
      await NftCreateFolderPage.drawerHeaderCloseButton.waitForDisplayed();
    }
  }

  async assertSeeCreateFolderPage(shouldSee: boolean, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await this.assertSeeCreateFolderPageDrawerNavigation(mode);
      await NftCreateFolderPage.drawerHeaderTitle.waitForDisplayed();
      await expect(await NftCreateFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.title')
      );

      await NftCreateFolderPage.folderNameInput.input.waitForDisplayed();

      await NftCreateFolderPage.folderNameInput.inputLabel.waitForDisplayed();
      await expect(await NftCreateFolderPage.folderNameInput.inputLabel.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.inputPlaceholder')
      );

      await NftCreateFolderPage.nextButton.waitForDisplayed();
      await expect(await NftCreateFolderPage.nextButton.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.cta.create')
      );
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed({ reverse: true });
    }
  }

  async assertSeeEmptyNameInput() {
    await expect(await NftFolderNameInput.input.getValue()).to.be.empty;
  }

  async assertSeeNextButtonEnabled(isEnabled: boolean) {
    await (isEnabled
      ? expect(await NftCreateFolderPage.nextButton.isEnabled()).to.be.true
      : expect(await NftCreateFolderPage.nextButton.isEnabled()).to.be.false);
  }

  async assertSeeInputMaxLengthError(shouldBeDisplayed: boolean, maxLength: number) {
    await NftCreateFolderPage.folderNameInput.inputError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      const expectedErrorMessage = (await t('browserView.nfts.folderDrawer.nameForm.inputError')).replace(
        '{{length}}',
        maxLength.toString()
      );
      expect(await NftCreateFolderPage.folderNameInput.inputError.getText()).to.equal(expectedErrorMessage);
    }
  }
}

export default new NftCreateFolderAssert();
