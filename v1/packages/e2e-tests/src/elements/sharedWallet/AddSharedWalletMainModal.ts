/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class AddSharedWalletMainModal {
  private MODAL = '.ant-modal-content';
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  private LOGO = '[data-testid="shared-wallet-setup-logo"]';
  private TITLE = '[data-testid="wallet-setup-title"]';
  private SUBTITLE = '[data-testid="shared-wallet-setup-subtitle"]';
  private SHARED_WALLET_KEY_GENERATE_ICON = '[data-testid="shared-wallet-generate-icon"]';
  private SHARED_WALLET_KEY_GENERATE_TITLE = '[data-testid="shared-wallet-generate-title"]';
  private SHARED_WALLET_KEY_GENERATE_DESCRIPTION = '[data-testid="shared-wallet-generate-description"]';
  private SHARED_WALLET_KEY_GENERATE_BUTTON = '[data-testid="shared-wallet-generate-button"]';
  private SHARED_WALLET_COPY_KEY_ICON = '[data-testid="shared-wallet-copy-icon"]';
  private SHARED_WALLET_COPY_KEY_TITLE = '[data-testid="shared-wallet-copy-title"]';
  private SHARED_WALLET_COPY_KEY_DESCRIPTION = '[data-testid="shared-wallet-copy-description"]';
  private SHARED_WALLET_COPY_KEY_BUTTON = '[data-testid="shared-wallet-copy-button"]';
  private SHARED_WALLET_CREATE_ICON = '[data-testid="shared-wallet-new-icon"]';
  private SHARED_WALLET_CREATE_TITLE = '[data-testid="shared-wallet-new-title"]';
  private SHARED_WALLET_CREATE_DESCRIPTION = '[data-testid="shared-wallet-new-description"]';
  private SHARED_WALLET_CREATE_BUTTON = '[data-testid="shared-wallet-new-button"]';
  private SHARED_WALLET_IMPORT_ICON = '[data-testid="shared-wallet-import-icon"]';
  private SHARED_WALLET_IMPORT_TITLE = '[data-testid="shared-wallet-import-title"]';
  private SHARED_WALLET_IMPORT_DESCRIPTION = '[data-testid="shared-wallet-import-description"]';
  private SHARED_WALLET_IMPORT_BUTTON = '[data-testid="shared-wallet-import-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOGO);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get generateSharedWalletKeyIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEY_GENERATE_ICON);
  }

  get generateSharedWalletKeyTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEY_GENERATE_TITLE);
  }

  get generateSharedWalletKeyDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEY_GENERATE_DESCRIPTION);
  }

  get generateSharedWalletKeyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEY_GENERATE_BUTTON);
  }

  get copySharedWalletKeyIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_COPY_KEY_ICON);
  }

  get copySharedWalletKeyTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_COPY_KEY_TITLE);
  }

  get copySharedWalletKeyDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_COPY_KEY_DESCRIPTION);
  }

  get copySharedWalletKeyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_COPY_KEY_BUTTON);
  }

  get createSharedWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_CREATE_ICON);
  }

  get createSharedWalletTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_CREATE_TITLE);
  }

  get createSharedWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_CREATE_DESCRIPTION);
  }

  get createSharedWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_CREATE_BUTTON);
  }

  get importSharedWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_IMPORT_ICON);
  }

  get importSharedWalletTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_IMPORT_TITLE);
  }

  get importSharedWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_IMPORT_DESCRIPTION);
  }

  get importSharedWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_IMPORT_BUTTON);
  }

  async clickOnGenerateButton() {
    await this.generateSharedWalletKeyButton.waitForClickable();
    await this.generateSharedWalletKeyButton.click();
  }

  async clickOnCreateButton() {
    await this.createSharedWalletButton.waitForClickable();
    await this.createSharedWalletButton.click();
  }

  async clickOnImportButton() {
    await this.importSharedWalletButton.waitForClickable();
    await this.importSharedWalletButton.click();
  }

  async clickOnCopyToClipboardButton() {
    await this.copySharedWalletKeyButton.waitForClickable();
    await this.copySharedWalletKeyButton.click();
  }
}

export default new AddSharedWalletMainModal();
