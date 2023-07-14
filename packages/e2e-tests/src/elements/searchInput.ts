class SearchInput {
  private CONTAINER = '[data-testid="search-input-container"]';
  private INPUT = '[data-testid="search-input"]';
  private ICON = '[data-testid="search-icon"]';
  private CLEAR_BUTTON = '[data-testid="search-clear-button"]';

  get container() {
    return $(this.CONTAINER);
  }

  get input() {
    return $(this.INPUT);
  }

  get icon() {
    return $(this.ICON);
  }

  get clearButton() {
    return $(this.CLEAR_BUTTON);
  }
}

export default new SearchInput();
