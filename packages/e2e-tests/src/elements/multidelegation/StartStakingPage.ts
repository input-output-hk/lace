class StartStakingPage {
  private BANNER_CONTAINER = '[data-testid="stake-funds-banner-container"]';
  private BANNER_TITLE = '[data-testid="stake-funds-banner-title"]';
  private BANNER_DESCRIPTION = '[data-testid="stake-funds-banner-description"]';
  private BANNER_BALANCE_TITLE = '[data-testid="stake-funds-banner-balance-title"]';
  private BANNER_BALANCE_VALUE = '[data-testid="stake-funds-banner-balance-value"]';
  private BANNER_BALANCE_SYMBOL = '[data-testid="stake-funds-banner-balance-symbol"]';
  private GET_STARTED_TITLE = '[data-testid="get-started-title"]';
  private GET_STARTED_DESCRIPTION = '[data-testid="get-started-description"]';
  private GET_STARTED_STEP_1_TITLE = '[data-testid="get-started-step1-title"]';
  private GET_STARTED_STEP_1_DESCRIPTION = '[data-testid="get-started-step1-description"]';
  private GET_STARTED_STEP_1_LINK = '[data-testid="get-started-step1-link"]';
  private GET_STARTED_STEP_2_TITLE = '[data-testid="get-started-step2-title"]';
  private GET_STARTED_STEP_2_DESCRIPTION = '[data-testid="get-started-step2-description"]';
  private GET_STARTED_STEP_2_LINK = '[data-testid="get-started-step2-link"]';
  private EXPANDED_VIEW_BANNER_CONTAINER = '[data-testid="expanded-view-banner-container"]';
  private EXPANDED_VIEW_BANNER_TITLE = '[data-testid="expanded-view-banner-title"]';
  private EXPANDED_VIEW_BANNER_DESCRIPTION = '[data-testid="expanded-view-banner-description"]';
  private EXPANDED_VIEW_BANNER_BUTTON = '[data-testid="expanded-view-banner-button"]';

  get bannerContainer() {
    return $(this.BANNER_CONTAINER);
  }

  get bannerTitle() {
    return $(this.BANNER_TITLE);
  }

  get bannerDescription() {
    return $(this.BANNER_DESCRIPTION);
  }

  get bannerBalanceTitle() {
    return $(this.BANNER_BALANCE_TITLE);
  }

  get bannerBalanceValue() {
    return $(this.BANNER_BALANCE_VALUE);
  }

  get bannerBalanceSymbol() {
    return $(this.BANNER_BALANCE_SYMBOL);
  }

  get getStartedTitle() {
    return $(this.GET_STARTED_TITLE);
  }

  get getStartedDescription() {
    return $(this.GET_STARTED_DESCRIPTION);
  }

  get getStartedStep1Title() {
    return $(this.GET_STARTED_STEP_1_TITLE);
  }

  get getStartedStep1Description() {
    return $(this.GET_STARTED_STEP_1_DESCRIPTION);
  }

  get getStartedStep1Link() {
    return $(this.GET_STARTED_STEP_1_LINK);
  }

  get getStartedStep2Title() {
    return $(this.GET_STARTED_STEP_2_TITLE);
  }

  get getStartedStep2Description() {
    return $(this.GET_STARTED_STEP_2_DESCRIPTION);
  }

  get getStartedStep2Link() {
    return $(this.GET_STARTED_STEP_2_LINK);
  }

  get expandedViewBannerContainer() {
    return $(this.EXPANDED_VIEW_BANNER_CONTAINER);
  }

  get expandedViewBannerTitle() {
    return $(this.EXPANDED_VIEW_BANNER_TITLE);
  }

  get expandedViewBannerDescription() {
    return $(this.EXPANDED_VIEW_BANNER_DESCRIPTION);
  }

  get expandedViewBannerButton() {
    return $(this.EXPANDED_VIEW_BANNER_BUTTON);
  }

  async clickGetStartedStep1Link() {
    await this.getStartedStep1Link.click();
  }

  async clickGetStartedStep2Link() {
    await this.getStartedStep2Link.click();
  }

  async clickExpandedViewBannerButton() {
    await this.expandedViewBannerButton.click();
  }
}

export default new StartStakingPage();
