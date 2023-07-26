import nftAddNftToFolderPage from '../elements/NFTs/nftAddNftToFolderPage';

class NftAddNftToFolderAssert {
  async assertSeeAddNftButton() {
    await nftAddNftToFolderPage.placeholderItem.waitForDisplayed();
    await nftAddNftToFolderPage.placeholderItem.waitForClickable();
  }

  async assertSeeNftAddNftToFolderPage() {
    await nftAddNftToFolderPage.drawerContent.waitForDisplayed();
    await nftAddNftToFolderPage.drawerHeaderTitle.waitForDisplayed();
    await nftAddNftToFolderPage.selectedFolderTitle.waitForDisplayed();
    await nftAddNftToFolderPage.selectedFolderNftCount.waitForDisplayed();
  }
}

export default new NftAddNftToFolderAssert();
