/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import Banner from '../banner';
import CommonDrawerElements from '../CommonDrawerElements';

class StakePoolDetails extends CommonDrawerElements {
  private CONTAINER = '//div[@data-testid="stake-pool-details"]';
  private POOL_NAME = '//div[@data-testid="stake-pool-item-name"]';
  private POOL_LOGO = '//img[@data-testid="stake-pool-item-logo"]';
  private POOL_TICKER = '//p[@data-testid="stake-pool-item-ticker"]';
  private STATISTICS_TITLE = '//div[@data-testid="stake-pool-details-title"]';
  private ACTIVE_STAKE_TITLE = '//div[@data-testid="active-stake-title"]';
  private ACTIVE_STAKE_VALUE = '//div[@data-testid="active-stake-value"]';
  private SATURATION_TITLE = '//div[@data-testid="saturation-title"]';
  private SATURATION_VALUE = '//div[@data-testid="saturation-value"]';
  private DELEGATORS_TITLE = '//div[@data-testid="delegators-title"]';
  private DELEGATORS_VALUE = '//div[@data-testid="delegators-value"]';
  // TODO APY is deprecated and replaced by ROS
  private APY_TITLE = '//div[@data-testid="ros-title"]';
  private APY_VALUE = '//div[@data-testid="ros-value"]';
  private INFORMATION_TITLE = '//div[@data-testid="stake-pool-details-information-title"]';
  private INFORMATION_DESCRIPTION = '//div[@data-testid="stake-pool-details-information-description"]';
  private SOCIAL_LINKS_TITLE = '//div[@data-testid="stake-pool-details-social-title"]';
  private SOCIAL_WEBSITE_ICON = '//div[@data-testid="WEBSITE-container"]';
  private POOL_IDS_TITLE = '//div[@data-testid="stake-pool-details-pool-ids-title"]';
  private POOL_ID = '//div[@data-testid="stake-pool-details-pool-id"]';
  private OWNERS_TITLE = '//div[@data-testid="stake-pool-details-owners-title"]';
  private OWNER = '//div[@data-testid="stake-pool-details-owner"]';
  private STAKE_BUTTON = '[data-testid="stake-pool-details-stake-btn"]';

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

  get rosTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.APY_TITLE);
  }

  get rosValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.APY_VALUE);
  }

  get banner(): typeof Banner {
    return Banner;
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

  get stakeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_BUTTON);
  }
}

export default new StakePoolDetails();
