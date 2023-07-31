import NftFolderContextMenu from '../elements/NFTs/NftFolderContextMenu';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import DeleteFolderModal from '../elements/NFTs/DeleteFolderModal';
import NftsFolderPage from '../elements/NFTs/nftsFolderPage';

class NftFolderAssert {
  async assertSeeNftFolderContextMenu(shouldBeDisplayed: boolean) {
    await NftFolderContextMenu.folderContextMenu.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await NftFolderContextMenu.deleteFolderOption.waitForDisplayed();
      expect(await NftFolderContextMenu.deleteFolderOption.getText()).to.equal(
        await t('browserView.nfts.contextMenu.delete')
      );
      await NftFolderContextMenu.renameFolderOption.waitForDisplayed();
      expect(await NftFolderContextMenu.renameFolderOption.getText()).to.equal(
        await t('browserView.nfts.contextMenu.rename')
      );
    }
  }

  async assertSeeNftContextMenu(shouldBeDisplayed: boolean) {
    await NftFolderContextMenu.folderContextMenu.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await NftFolderContextMenu.removeNFTOption.waitForDisplayed();
      expect(await NftFolderContextMenu.removeNFTOption.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.contextMenu.remove')
      );
    }
  }

  async assertSeeDeleteFolderModal(shouldBeDisplayed: boolean) {
    await DeleteFolderModal.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await DeleteFolderModal.title.waitForDisplayed();
      expect(await DeleteFolderModal.title.getText()).to.equal(await t('browserView.nfts.deleteFolderModal.header'));

      await DeleteFolderModal.description.waitForDisplayed();
      const expectedDescription = `${await t('browserView.nfts.deleteFolderModal.description1')} ${await t(
        'browserView.nfts.deleteFolderModal.description2'
      )}`.replace(/\s/g, '');
      const actualDescription = (await DeleteFolderModal.description.getText()).replace(/\s/g, '');
      expect(actualDescription).to.equal(expectedDescription);

      await DeleteFolderModal.cancelButton.waitForDisplayed();
      expect(await DeleteFolderModal.cancelButton.getText()).to.equal(
        await t('browserView.nfts.deleteFolderModal.cancel')
      );

      await DeleteFolderModal.confirmButton.waitForDisplayed();
      expect(await DeleteFolderModal.confirmButton.getText()).to.equal(
        await t('browserView.nfts.deleteFolderModal.confirm')
      );
    }
  }

  async assertSeeAddNftButton() {
    await NftsFolderPage.addNftButton.waitForClickable();
  }
}

export default new NftFolderAssert();
