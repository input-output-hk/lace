/* global WebdriverIO */
import CommonDrawerElements from './CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class WalletSettingsDrawer extends CommonDrawerElements {
  private readonly ANT_DRAWER_BODY = '(//div[@class="ant-drawer-body"])[2]'; // Duplicated elements in DOM
  private readonly RENAME_WALLET_LABEL = '//span[@data-testid="rename-wallet-label"]';
  private readonly RENAME_WALLET_INPUT = '//input[@data-testid="rename-wallet-name-input"]';
  private readonly RENAME_WALLET_INPUT_LABEL = '//label[@data-testid="rename-wallet-name-label"]';
  private readonly RENAME_WALLET_INPUT_ERROR = '//span[@data-testid="rename-wallet-name-error"]';
  private readonly RENAME_ENABLED_ACCOUNTS_LABEL = '//span[@data-testid="rename-enabled-accounts-label"]';
  private readonly ACCOUNT_NAME_INPUT_TEMPLATE = '//input[@data-testid="rename-account-###INDEX###-input"]';
  private readonly ACCOUNT_NAME_INPUT_LABEL_TEMPLATE = '//label[@data-testid="rename-account-###INDEX###-label"]';
  private readonly ACCOUNT_NAME_INPUT_ERROR_TEMPLATE = '//span[@data-testid="rename-account-###INDEX###-error"]';
  private readonly SAVE_BUTTON = '//button[@data-testid="rename-wallet-save-button"]';
  private readonly CANCEL_BUTTON = '//button[@data-testid="rename-wallet-cancel-button"]';

  get renameWalletLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.RENAME_WALLET_LABEL}`);
  }

  get renameWalletInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.RENAME_WALLET_INPUT}`);
  }

  get renameWalletInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.RENAME_WALLET_INPUT_LABEL}`);
  }

  get renameWalletInputError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RENAME_WALLET_INPUT_ERROR);
  }

  get renameEnabledAccountsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.RENAME_ENABLED_ACCOUNTS_LABEL}`);
  }

  get saveButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.SAVE_BUTTON}`);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.CANCEL_BUTTON}`);
  }

  getAccountNameInput(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    // eslint-disable-next-line sonarjs/no-duplicate-string
    return $(`${this.ANT_DRAWER_BODY}${this.ACCOUNT_NAME_INPUT_TEMPLATE.replace('###INDEX###', String(index))}`);
  }

  getAccountNameInputLabel(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.ACCOUNT_NAME_INPUT_LABEL_TEMPLATE.replace('###INDEX###', String(index))}`);
  }

  getRenameAccountInputError(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.ANT_DRAWER_BODY}${this.ACCOUNT_NAME_INPUT_ERROR_TEMPLATE.replace('###INDEX###', String(index))}`);
  }

  async clickOnCancelButton(): Promise<void> {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickOnSaveButton(): Promise<void> {
    await this.saveButton.waitForClickable();
    await this.saveButton.click();
  }
}

export default new WalletSettingsDrawer();
