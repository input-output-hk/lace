/* global WebdriverIO */
import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement } from 'webdriverio';

class ConfigureMidnightPage extends CommonOnboardingElements {
  private readonly NODE_ADDRESS_INPUT = '[data-testid="node-address-input"]';
  private readonly NODE_ADDRESS_INPUT_LAEBL = '[data-testid="node-address-input"] + label';
  private readonly PUB_SUB_INDEXER_ADDRESS_INPUT = '[data-testid="indexer-address-input"]';
  private readonly PUB_SUB_INDEXER_ADDRESS_INPUT_LABEL = '[data-testid="indexer-address-input"] + label';
  private readonly PROOF_SERVER_ADDRESS_OPTION_LOCAL =
    '[data-testid="configure-midnight-proof-server-section-option-local"] label';
  private readonly PROOF_SERVER_ADDRESS_LABEL = '[data-testid="configure-midnight-proof-server-section-label"]';
  private readonly NETWORK_LABEL = '[data-testid="configure-midnight-network-section-label"]';
  private readonly NETWORK_OPTION_UNDEPLOYED = '[data-testid="configure-midnight-network-section-option-0"] label';
  private readonly NETWORK_OPTION_TESTNET = '[data-testid="configure-midnight-network-section-option-2"] label';

  get enterWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.nextButton;
  }

  get nodeAddressInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NODE_ADDRESS_INPUT);
  }

  get indexerAddressInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUB_SUB_INDEXER_ADDRESS_INPUT);
  }

  get proofServerOptionLocal(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PROOF_SERVER_ADDRESS_OPTION_LOCAL);
  }

  get nodeAddressInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NODE_ADDRESS_INPUT_LAEBL);
  }

  get indexerAddressInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUB_SUB_INDEXER_ADDRESS_INPUT_LABEL);
  }

  get proofServerSectionLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PROOF_SERVER_ADDRESS_LABEL);
  }

  get networkSectionLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_LABEL);
  }

  get networkOptionUndeployed(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_OPTION_UNDEPLOYED);
  }

  get networkOptionTestnet(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_OPTION_TESTNET);
  }
}

export default new ConfigureMidnightPage();
