class Tooltip {
  private TOOLTIP_COMPONENT = '[data-testid="tooltip"]';
  private TOOLTIP_LABEL = '[data-testid="tooltip-label"]';
  private TOOLTIP_VALUE = '[data-testid="tooltip-value"]';

  get component() {
    return $(this.TOOLTIP_COMPONENT);
  }

  get label() {
    return $(this.TOOLTIP_LABEL);
  }

  get value() {
    return $(this.TOOLTIP_VALUE);
  }
}

export default new Tooltip();
