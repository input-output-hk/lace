/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import SearchInput from '../searchInput';

class NftSelectNftsPage extends CommonDrawerElements {
  private COUNTER = '[data-testid="assets-counter"]';
  private CLEAR_BUTTON = '[data-testid="assets-clear"]';
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-asset-picker-cta"]';
  private ASSET_SELECTOR_CONTAINER = '[data-testid="asset-selector-wrapper"]';

  get counter() {
    return $(this.COUNTER);
  }

  get clearButton() {
    return $(this.CLEAR_BUTTON);
  }

  get searchInput(): typeof SearchInput {
    return SearchInput;
  }

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get assetSelectorContainer() {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }
}

export default new NftSelectNftsPage();
