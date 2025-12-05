import { expect } from 'chai';
import { t } from '../utils/translationService';
import NftRenameFolderPage from '../elements/NFTs/NftRenameFolderPage';

class NftRenameFolderAsserts {
  async assertSeeDrawerNavigation(mode: 'extended' | 'popup', drawerTitleTranslationKey: string) {
    if (mode === 'popup') {
      await NftRenameFolderPage.drawerHeaderBackButton.waitForDisplayed({ reverse: true });
    } else {
      await NftRenameFolderPage.drawerBody.waitForClickable();
      await NftRenameFolderPage.drawerNavigationTitle.waitForDisplayed();
      expect(await NftRenameFolderPage.drawerNavigationTitle.getText()).to.equal(await t(drawerTitleTranslationKey));
      await NftRenameFolderPage.drawerHeaderCloseButton.waitForDisplayed();
    }
  }

  async assertSeeRenameFolderDrawer(shouldSee: boolean, mode: 'extended' | 'popup') {
    await NftRenameFolderPage.drawerBody.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await this.assertSeeDrawerNavigation(mode, 'browserView.nfts.folderDrawer.existingFolderHeader');
      await NftRenameFolderPage.drawerHeaderTitle.waitForClickable();
      expect(await NftRenameFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.renameYourFolder')
      );

      await NftRenameFolderPage.folderNameInput.inputLabel.waitForDisplayed();
      expect(await NftRenameFolderPage.folderNameInput.inputLabel.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.inputPlaceholder')
      );

      await NftRenameFolderPage.folderNameInput.input.waitForDisplayed();
      expect(await NftRenameFolderPage.folderNameInput.input.getValue()).to.match(/^(?!\s*$).+/);

      await NftRenameFolderPage.confirmButton.waitForDisplayed();
      expect(await NftRenameFolderPage.confirmButton.getText()).to.equal(await t('general.button.confirm'));
      await NftRenameFolderPage.cancelButton.waitForDisplayed();
      expect(await NftRenameFolderPage.cancelButton.getText()).to.equal(await t('general.button.cancel'));
    }
  }

  async assertSeeConfirmButtonEnabled(shouldBeEnabled: boolean) {
    await NftRenameFolderPage.confirmButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertSeeNameInputValue(folderName: string) {
    expect(await NftRenameFolderPage.folderNameInput.input.getValue()).to.equal(folderName);
  }
}

export default new NftRenameFolderAsserts();
