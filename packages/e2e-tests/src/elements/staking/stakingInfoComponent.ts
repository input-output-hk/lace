/* eslint-disable no-undef */
import { StatsComponent } from './statsComponent';

class StakingInfoComponent {
  private CONTAINER = '[data-testid="delegated-pool-item"]';
  private TITLE = '[data-testid="staking-info-title"]';
  private POOL_LOGO = '[data-testid="stake-pool-logo"]';
  private POOL_NAME = '[data-testid="stake-pool-name"]';
  private POOL_TICKER = '[data-testid="stake-pool-ticker"]';
  private STATS_APY_CONTAINER = '[data-testid="stats-ros-container"]';
  private STATS_FEE_CONTAINER = '[data-testid="stats-fee-container"]';
  private STATS_MARGIN_CONTAINER = '[data-testid="stats-margin-container"]';
  private STATS_LAST_REWARD_CONTAINER = '[data-testid="stats-last-reward-container"]';
  private STATS_TOTAL_STAKED_CONTAINER = '[data-testid="stats-total-staked-container"]';
  private STATS_TOTAL_REWARDS_CONTAINER = '[data-testid="stats-total-rewards-container"]';

  get container() {
    return $(this.CONTAINER);
  }
  get title() {
    return $(this.TITLE);
  }
  get poolLogo() {
    return $(this.POOL_LOGO);
  }
  get poolName() {
    return $(this.POOL_NAME);
  }
  get poolTicker() {
    return $(this.POOL_TICKER);
  }

  get statsApy(): StatsComponent {
    return new StatsComponent(this.STATS_APY_CONTAINER);
  }

  get statsFee(): StatsComponent {
    return new StatsComponent(this.STATS_FEE_CONTAINER);
  }

  get statsMargin(): StatsComponent {
    return new StatsComponent(this.STATS_MARGIN_CONTAINER);
  }

  get statsTotalStaked(): StatsComponent {
    return new StatsComponent(this.STATS_TOTAL_STAKED_CONTAINER);
  }

  get statsLastReward(): StatsComponent {
    return new StatsComponent(this.STATS_LAST_REWARD_CONTAINER);
  }

  get statsTotalRewards(): StatsComponent {
    return new StatsComponent(this.STATS_TOTAL_REWARDS_CONTAINER);
  }

  async clickPoolName(title: string): Promise<void> {
    const el: WebdriverIO.Element = await $$(this.POOL_NAME).find(
      async (item: WebdriverIO.Element) => (await item.getText()) === title
    );
    await el.click();
  }

  async hoverOverTotalStakedValue(): Promise<void> {
    await this.statsTotalStaked.value.scrollIntoView();
    await this.statsTotalStaked.value.moveTo();
  }

  async hoverOverTotalRewardsValue(): Promise<void> {
    await this.statsTotalRewards.value.scrollIntoView();
    await this.statsTotalRewards.value.moveTo();
  }

  async hoverOverLastRewardValue(): Promise<void> {
    await this.statsLastReward.value.scrollIntoView();
    await this.statsLastReward.value.moveTo();
  }
}
export default new StakingInfoComponent();
