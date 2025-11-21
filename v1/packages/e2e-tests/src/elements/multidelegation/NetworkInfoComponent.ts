/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class NetworkInfoComponent {
  private NETWORK_CONTAINER = '[data-testid="network-header-container"]';
  private NETWORK_HEADER_TITLE = '[data-testid="network-header-title"]';
  private CURRENT_EPOCH_LABEL = '[data-testid="network-current-epoch-label"]';
  private CURRENT_EPOCH_DETAIL = '[data-testid="network-current-epoch-detail"]';
  private EPOCH_END_LABEL = '[data-testid="network-epoch-end-label"]';
  private EPOCH_END_DETAIL = '[data-testid="network-epoch-end-detail"]';
  private TOTAL_POOLS_LABEL = '[data-testid="network-total-pools-label"]';
  private TOTAL_POOLS_DETAIL = '[data-testid="network-total-pools-detail"]';
  private NETWORK_STAKED_LABEL = '[data-testid="network-staked-label"]';
  private NETWORK_STAKED_DETAIL = '[data-testid="network-staked-detail"]';

  get networkContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_CONTAINER);
  }

  get networkTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_HEADER_TITLE);
  }

  get currentEpochLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CURRENT_EPOCH_LABEL);
  }

  get currentEpochDetail(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CURRENT_EPOCH_DETAIL);
  }

  get epochEndLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EPOCH_END_LABEL);
  }

  get epochEndDetail(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EPOCH_END_DETAIL);
  }

  get totalPoolsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOTAL_POOLS_LABEL);
  }

  get totalPoolsDetail(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOTAL_POOLS_DETAIL);
  }

  get percentageStakedLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_STAKED_LABEL);
  }

  get percentageStakedDetail(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_STAKED_DETAIL);
  }
}

export default new NetworkInfoComponent();
