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
  private LIVE_STAKE_TITLE = '[data-testid="live-stake-title"]';
  private LIVE_STAKE_VALUE = '[data-testid="live-stake-value"]';
  private SATURATION_TITLE = '[data-testid="saturation-title"]';
  private SATURATION_VALUE = '[data-testid="saturation-value"]';
  private SATURATION_PROGRESS_BAR = '[data-testid="stake-pool-card-saturation-bar"]';
  private DELEGATORS_TITLE = '[data-testid="delegators-title"]';
  private DELEGATORS_VALUE = '[data-testid="delegators-value"]';
  private ROS_TITLE = '[data-testid="ros-title"]';
  private ROS_VALUE = '[data-testid="ros-value"]';
  private BLOCKS_TITLE = '[data-testid="blocks-title"]';
  private BLOCKS_VALUE = '[data-testid="blocks-value"]';
  private COST_PER_EPOCH_TITLE = '[data-testid="cost-title"]';
  private COST_PER_EPOCH_VALUE = '[data-testid="cost-value"]';
  private PLEDGE_TITLE = '[data-testid="pledge-title"]';
  private PLEDGE_VALUE = '[data-testid="pledge-value"]';
  private POOL_MARGIN_TITLE = '[data-testid="margin-title"]';
  private POOL_MARGIN_VALUE = '[data-testid="margin-value"]';
  private INFORMATION_TITLE = '[data-testid="stake-pool-details-information-title"]';
  private INFORMATION_DESCRIPTION = '[data-testid="stake-pool-details-information-description"]';
  private SOCIAL_LINKS_TITLE = '[data-testid="stake-pool-details-social-title"]';
  private SOCIAL_WEBSITE_ICON = '[data-testid="WEBSITE-container"]';
  private POOL_IDS_TITLE = '[data-testid="stake-pool-details-pool-ids-title"]';
  private POOL_ID = '[data-testid="stake-pool-details-pool-id"]';
  private OWNERS_TITLE = '[data-testid="stake-pool-details-owners-title"]';
  private OWNER = '[data-testid="stake-pool-details-owner"]';
  private STAKE_ALL_ON_THIS_POOL_BUTTON = '[data-testid="stake-pool-details-stake-btn"]';
  private MANAGE_DELEGATION_BUTTON = '[data-testid="stake-pool-details-manage-delegation-btn"]';
  private SELECT_POOL_FOR_MULTISTAKING_BUTTON = '[data-testid="stake-pool-details-select-for-multi-staking-btn"]';
  private ADD_STAKING_POOL_BUTTON = '[data-testid="stake-pool-details-add-staking-pool-btn"]';
  private TOOLTIP = '.ant-tooltip';

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

  get liveStakeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LIVE_STAKE_TITLE);
  }

  get liveStakeValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LIVE_STAKE_VALUE);
  }

  get saturationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SATURATION_TITLE);
  }

  get saturationValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SATURATION_VALUE);
  }

  get saturationProgressBar(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SATURATION_PROGRESS_BAR);
  }

  get delegatorsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATORS_TITLE);
  }

  get delegatorsValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATORS_VALUE);
  }

  get rosTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ROS_TITLE);
  }

  get rosValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ROS_VALUE);
  }

  get blocksTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BLOCKS_TITLE);
  }

  get blocksValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BLOCKS_VALUE);
  }

  get costPerEpochTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COST_PER_EPOCH_TITLE);
  }

  get costPerEpochValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COST_PER_EPOCH_VALUE);
  }

  get pledgeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PLEDGE_TITLE);
  }

  get pledgeValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PLEDGE_VALUE);
  }

  get poolMarginTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_MARGIN_TITLE);
  }

  get poolMarginValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_MARGIN_VALUE);
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

  get addStakingPollButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_STAKING_POOL_BUTTON);
  }

  get manageDelegationButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MANAGE_DELEGATION_BUTTON);
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
