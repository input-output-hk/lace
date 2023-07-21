class NftFolderContextMenu {
  private NFT_FOLDER_CONTEXT_MENU = '[data-testid="nft-folder-context-menu"]';
  private NFT_FOLDER_CONTEXT_MENU_RENAME = '[data-testid="context-menu-item-rename"]';
  private NFT_FOLDER_CONTEXT_MENU_DELETE = '[data-testid="context-menu-item-delete"';

  get folderContextMenu() {
    return $(this.NFT_FOLDER_CONTEXT_MENU);
  }

  get renameOption() {
    return this.folderContextMenu.$(this.NFT_FOLDER_CONTEXT_MENU_RENAME);
  }

  get deleteOption() {
    return this.folderContextMenu.$(this.NFT_FOLDER_CONTEXT_MENU_DELETE);
  }

  async clickRenameOption() {
    await this.renameOption.waitForClickable();
    await this.renameOption.click();
  }

  async clickDeleteOption() {
    await this.deleteOption.waitForClickable();
    await this.deleteOption.click();
  }
}

export default new NftFolderContextMenu();
