import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { CoinConfigure } from './coinConfigure';

export class AssetInput extends WebElement {
  protected CONTAINER = '//div[@data-testid="asset-input-container"]';
  private ASSET_ADD_BUTTON = '//button[@data-testid="asset-add-button"]';

  constructor() {
    super();
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  assetAddButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ASSET_ADD_BUTTON}`, 'xpath');
  }

  assetAddButtonMultiple(index: number): WebElement {
    return Factory.fromSelector(`(${this.CONTAINER}${this.ASSET_ADD_BUTTON})[${index}]`, 'xpath');
  }

  coinConfigure(bundleIndex?: number, tokenName?: string): CoinConfigure {
    return new CoinConfigure(bundleIndex, tokenName);
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
