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

  get networkContainer() {
    return $(this.NETWORK_CONTAINER);
  }

  get networkTitle() {
    return $(this.NETWORK_HEADER_TITLE);
  }

  get currentEpochLabel() {
    return $(this.CURRENT_EPOCH_LABEL);
  }

  get currentEpochDetail() {
    return $(this.CURRENT_EPOCH_DETAIL);
  }

  get epochEndLabel() {
    return $(this.EPOCH_END_LABEL);
  }

  get epochEndDetail() {
    return $(this.EPOCH_END_DETAIL);
  }

  get totalPoolsLabel() {
    return $(this.TOTAL_POOLS_LABEL);
  }

  get totalPoolsDetail() {
    return $(this.TOTAL_POOLS_DETAIL);
  }

  get percentageStakedLabel() {
    return $(this.NETWORK_STAKED_LABEL);
  }

  get percentageStakedDetail() {
    return $(this.NETWORK_STAKED_DETAIL);
  }
}

export default new NetworkInfoComponent();
