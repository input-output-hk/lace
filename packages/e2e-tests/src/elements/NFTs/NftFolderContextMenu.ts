class NftFolderContextMenu {
  private NFT_FOLDER_CONTEXT_MENU = '[data-testid="nft-folder-context-menu"]';
  private NFT_FOLDER_CONTEXT_MENU_RENAME = '[data-testid="context-menu-item-rename"]';
  private NFT_FOLDER_CONTEXT_MENU_DELETE = '[data-testid="context-menu-item-delete"]';
  private NFT_FOLDER_CONTEXT_MENU_REMOVE = '[data-testid="context-menu-item-remove"]';
  private NFT_FOLDER_CONTEXT_MENU_OVERLAY = '[data-testid="portal"]';

  get folderContextMenu() {
    return $(this.NFT_FOLDER_CONTEXT_MENU);
  }

  get renameFolderOption() {
    return this.folderContextMenu.$(this.NFT_FOLDER_CONTEXT_MENU_RENAME);
  }

  get deleteFolderOption() {
    return this.folderContextMenu.$(this.NFT_FOLDER_CONTEXT_MENU_DELETE);
  }

  get removeNFTOption() {
    return this.folderContextMenu.$(this.NFT_FOLDER_CONTEXT_MENU_REMOVE);
  }

  get overlay() {
    return $(this.NFT_FOLDER_CONTEXT_MENU_OVERLAY);
  }

  async clickRenameFolderOption() {
    await this.renameFolderOption.waitForClickable();
    await this.renameFolderOption.click();
  }

  async clickDeleteFolderOption() {
    await this.deleteFolderOption.waitForClickable();
    await this.deleteFolderOption.click();
  }

  async clickRemoveNFTOption() {
    await this.removeNFTOption.waitForClickable();
    await this.removeNFTOption.click();
  }
}

export default new NftFolderContextMenu();
