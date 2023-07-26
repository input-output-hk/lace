import CommonDrawerElements from '../CommonDrawerElements';

class NftAddNftToFolderPage extends CommonDrawerElements {
  private DRAWER_CONTENT = '.ant-drawer-content';
  private PLACEHOLDER_ITEM = '[data-testid="placeholder-item"]';
  private SELECTED_FOLDER_TITLE = '[data-testid="selected-folder-title"]';
  private SELECTED_FOLDER_NFT_COUNTER = '[data-testid="selected-folder-nft-counter"]';

  get placeholderItem() {
    return $(this.PLACEHOLDER_ITEM);
  }

  get drawerContent() {
    return $(this.DRAWER_CONTENT);
  }

  get selectedFolderTitle() {
    return $(this.SELECTED_FOLDER_TITLE);
  }

  get selectedFolderNftCount() {
    return $(this.SELECTED_FOLDER_NFT_COUNTER);
  }

  async addNFT() {
    await this.placeholderItem.waitForClickable();
    await this.placeholderItem.click();
  }
}

export default new NftAddNftToFolderPage();
