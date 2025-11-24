/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { StatsComponent } from './StatsComponent';

class StakingInfoCard {
  protected CONTAINER_SELECTOR;
  private ITEM = '//div[@data-testid="delegated-pool-item"]';
  private POOL_LOGO = '//img[@data-testid="stake-pool-logo"]';
  private POOL_NAME = '//div[@data-testid="stake-pool-name"]';
  private POOL_TICKER = '//div[@data-testid="stake-pool-ticker"]';
  private STATS_ROS_CONTAINER = '//div[@data-testid="stats-ros-container"]';
  private STATS_FEE_CONTAINER = '//div[@data-testid="stats-fee-container"]';
  private STATS_MARGIN_CONTAINER = '//div[@data-testid="stats-margin-container"]';
  private STATS_LAST_REWARD_CONTAINER = '//div[@data-testid="stats-last-reward-container"]';
  private STATS_TOTAL_STAKED_CONTAINER = '//div[@data-testid="stats-total-staked-container"]';
  private STATS_TOTAL_REWARDS_CONTAINER = '//div[@data-testid="stats-total-rewards-container"]';
  private readonly index;

  constructor(index = 1) {
    this.CONTAINER_SELECTOR = `(${this.ITEM})[${index}]`;
    this.index = index;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR);
  }

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.POOL_LOGO}`);
  }

  get name(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.POOL_NAME}`);
  }

  get ticker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.POOL_TICKER}`);
  }

  get statsROS(): StatsComponent {
    return new StatsComponent(`(${this.STATS_ROS_CONTAINER})[${this.index}]`);
  }

  get statsFee(): StatsComponent {
    return new StatsComponent(`(${this.STATS_FEE_CONTAINER})[${this.index}]`);
  }

  get statsMargin(): StatsComponent {
    return new StatsComponent(`(${this.STATS_MARGIN_CONTAINER})[${this.index}]`);
  }

  get statsTotalStaked(): StatsComponent {
    return new StatsComponent(`(${this.STATS_TOTAL_STAKED_CONTAINER})[${this.index}]`);
  }

  get statsTotalRewards(): StatsComponent {
    return new StatsComponent(`(${this.STATS_TOTAL_REWARDS_CONTAINER})[${this.index}]`);
  }

  get statsLastReward(): StatsComponent {
    return new StatsComponent(`(${this.STATS_LAST_REWARD_CONTAINER})[${this.index}]`);
  }

  async clickOnPoolName(): Promise<void> {
    await this.name.waitForClickable();
    await this.name.click();
  }
}

export default StakingInfoCard;
