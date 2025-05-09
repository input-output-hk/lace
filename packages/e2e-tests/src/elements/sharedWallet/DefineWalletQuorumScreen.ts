/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';

class DefineWalletQuorumScreen extends AddSharedWalletCommonModalElements {
  private ALL_ADDRESSES_COMPONENT = '[data-testid="setup-quorum-user-option-AllAddresses"]';
  private ALL_ADDRESSES_RADIO_BUTTON = '#radio-btn-control-id-AllAddresses';
  private ALL_ADDRESSES_RADIO_LABEL = '#radio-btn-label-id-AllAddresses';
  private SOME_ADDRESSES_COMPONENT = '[data-testid="setup-quorum-user-option-RequireNOf"]';
  private SOME_ADDRESSES_RADIO_BUTTON = '#radio-btn-control-id-RequireNOf';
  private SOME_ADDRESSES_RADIO_LABEL = '#radio-btn-label-id-RequireNOf';
  private COSIGNERS_DROPDOWN_TRIGGER = '[data-testid="number-of-cosigners-dropdown-trigger"]';
  private COSIGNERS_TOTAL_SIGNATURES_LABEL = '[data-testid="total-signatures-label"]';
  private COSIGNERS_DROPDOWN_OPTION_1 = '[role="listbox"] [data-testid="1"]';
  private COSIGNERS_DROPDOWN_OPTION_2 = '[role="listbox"] [data-testid="2"]';

  get allAddressesComponent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ALL_ADDRESSES_COMPONENT);
  }

  get allAddressesRadio(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ALL_ADDRESSES_RADIO_BUTTON);
  }

  get allAddressesLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ALL_ADDRESSES_RADIO_LABEL);
  }

  get someAddressesComponent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOME_ADDRESSES_COMPONENT);
  }

  get someAddressesRadio(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOME_ADDRESSES_RADIO_BUTTON);
  }

  get someAddressesLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOME_ADDRESSES_RADIO_LABEL);
  }

  get cosignersDropdownTrigger(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNERS_DROPDOWN_TRIGGER);
  }

  get cosignersTotalSignaturesLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNERS_TOTAL_SIGNATURES_LABEL);
  }

  get cosignersDropdownOption1(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNERS_DROPDOWN_OPTION_1);
  }

  get cosignersDropdownOption2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNERS_DROPDOWN_OPTION_2);
  }

  async selectOption(option: 'All addresses must sign' | 'Some addresses must sign'): Promise<void> {
    switch (option) {
      case 'All addresses must sign':
        await this.allAddressesRadio.click();
        break;
      case 'Some addresses must sign':
        await this.someAddressesRadio.click();
        break;
      default:
        throw new Error(`Unknown option '${option}'`);
    }
  }

  async openCosignersSelectionDropdown(): Promise<void> {
    await this.cosignersDropdownTrigger.waitForClickable();
    await this.cosignersDropdownTrigger.click();
  }

  async selectNumberOfCosigners(numberOfCosigners: number): Promise<void> {
    switch (numberOfCosigners) {
      case 1:
        await this.cosignersDropdownOption1.waitForClickable();
        await this.cosignersDropdownOption1.click();
        break;
      case 2:
        await this.cosignersDropdownOption2.waitForClickable();
        await this.cosignersDropdownOption2.click();
        break;
      default:
        throw new Error(`Unsupported number of cosigners: ${numberOfCosigners}`);
    }
  }
}

export default new DefineWalletQuorumScreen();
