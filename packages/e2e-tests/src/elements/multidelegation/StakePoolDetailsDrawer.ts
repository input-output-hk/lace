/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';

class StakePoolDetailsDrawer extends CommonDrawerElements {
  private CONTAINER = '[data-testid="stake-pool-details"]';
  private POOL_NAME = '[data-testid="stake-pool-item-name"]';
  private POOL_LOGO = '[data-testid="stake-pool-item-logo"]';
  private POOL_TICKER = '[data-testid="stake-pool-item-ticker"]';
  private DELEGATED_BADGE = '[data-testid="stake-pool-badge-delegated"]';
  private STATISTICS_TITLE = '[data-testid="stake-pool-details-title"]';
  private ACTIVE_STAKE_TITLE = '[data-testid="active-stake-title"]';
  private ACTIVE_STAKE_VALUE = '[data-testid="active-stake-value"]';
  private SATURATION_TITLE = '[data-testid="saturation-title"]';
  private SATURATION_VALUE = '[data-testid="saturation-value"]';
  private DELEGATORS_TITLE = '[data-testid="delegators-title"]';
  private DELEGATORS_VALUE = '[data-testid="delegators-value"]';
  private APY_TITLE = '[data-testid="apy-title"]';
  private APY_VALUE = '[data-testid="apy-value"]';
  private INFORMATION_TITLE = '[data-testid="stake-pool-details-information-title"]';
  private INFORMATION_DESCRIPTION = '[data-testid="stake-pool-details-information-description"]';
  private SOCIAL_LINKS_TITLE = '[data-testid="stake-pool-details-social-title"]';
  private SOCIAL_WEBSITE_ICON = '[data-testid="WEBSITE-container"]';
  private POOL_IDS_TITLE = '[data-testid="stake-pool-details-pool-ids-title"]';
  private POOL_ID = '[data-testid="stake-pool-details-pool-id"]';
  private OWNERS_TITLE = '[data-testid="stake-pool-details-owners-title"]';
  private OWNER = '[data-testid="stake-pool-details-owner"]';
  private STAKE_ALL_ON_THIS_POOL_BUTTON = '[data-testid="stake-pool-details-stake-btn"]';
  private SELECT_POOL_FOR_MULTISTAKING_BUTTON = '[data-testid="stake-pool-details-select-for-multi-staking-btn"]';
  private TOOLTIP = '[data-testid="ant-tooltip"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get poolName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_NAME);
  }

  get poolLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_LOGO);
  }

  get poolTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_TICKER);
  }

  get statisticsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STATISTICS_TITLE);
  }

  get activeStakeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_STAKE_TITLE);
  }

  get activeStakeValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_STAKE_VALUE);
  }

  get saturationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SATURATION_TITLE);
  }

  get saturationValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SATURATION_VALUE);
  }

  get delegatorsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATORS_TITLE);
  }

  get delegatorsValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATORS_VALUE);
  }

  get apyTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.APY_TITLE);
  }

  get apyValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.APY_VALUE);
  }

  get informationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INFORMATION_TITLE);
  }

  get informationDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INFORMATION_DESCRIPTION);
  }

  get socialLinksTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOCIAL_LINKS_TITLE);
  }

  get socialWebsiteIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOCIAL_WEBSITE_ICON);
  }

  get poolIdsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_IDS_TITLE);
  }

  get poolId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_ID);
  }

  get ownersTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OWNERS_TITLE);
  }

  get owners(): Promise<WebdriverIO.ElementArray> {
    return $$(this.OWNER);
  }

  get stakeAllOnThisPoolButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_ALL_ON_THIS_POOL_BUTTON);
  }

  get selectPoolForMultiStakingButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SELECT_POOL_FOR_MULTISTAKING_BUTTON);
  }

  get delegatedBadge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATED_BADGE);
  }

  get tooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP);
  }

  async saveStakePoolDetails() {
    const poolName = await this.poolName.getText();
    testContext.save('poolName', poolName);
    const poolTicker = await this.poolTicker.getText();
    testContext.save('poolTicker', poolTicker);
    const poolID = await this.poolId.getText();
    testContext.save('poolID', poolID);
  }
}

export default new StakePoolDetailsDrawer();
