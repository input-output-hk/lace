/* eslint-disable no-undef*/
import { ChainablePromiseElement } from 'webdriverio';

class StakingConfirmationScreen {
  private TITLE = '//div[@data-testid="staking-confirmation-title"]';
  private SUBTITLE = '//div[@data-testid="staking-confirmation-subtitle"]';
  private CARDANO_NAME = '(//div[@data-testid="sp-confirmation-item-text"])[1]';
  private CARDANO_LOGO = '(//img[@data-testid="sp-confirmation-item-logo"])[1]';
  private CARDANO_TICKER = '(//div[@data-testid="sp-confirmation-item-subtext"])[1]';
  private CARDANO_BALANCE_ADA = '(//div[@data-testid="sp-confirmation-item-text"])[2]';
  private CARDANO_BALANCE_FIAT = '(//div[@data-testid="sp-confirmation-item-subtext"])[2]';
  private POOL_NAME = '(//div[@data-testid="sp-confirmation-item-text"])[3]';
  private POOL_LOGO = '(//img[@data-testid="sp-confirmation-item-logo"])[2]';
  private POOL_TICKER = '(//div[@data-testid="sp-confirmation-item-subtext"])[3]';
  private POOL_ID = '//div[@data-testid="ellipsis-container"]';
  private FEE_ADA = '//span[@data-testid="asset-info-amount"]';
  private FEE_FIAT = '//span[@data-testid="asset-info-amount-fiat"]';
  private TX_FEE_LABEL = '//p[@data-testid="sp-confirmation-staking-fee-label"]';
  private NEXT_BTTN = '//button[@data-testid="stake-pool-confirmation-btn"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get cardanoName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_NAME);
  }

  get cardanoLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_LOGO);
  }
  get cardanoTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_TICKER);
  }

  get cardanoBalanceAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_BALANCE_ADA);
  }

  get cardanoBalanceFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_BALANCE_FIAT);
  }

  get poolName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_NAME);
  }
  get poolLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOL_LOGO);
  }

  get feeAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FEE_ADA);
  }
  get feeFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FEE_FIAT);
  }

  get txFeeLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TX_FEE_LABEL);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BTTN);
  }

  async poolId(currentStakepoolHasMetadata: boolean): Promise<WebdriverIO.Element> {
    return currentStakepoolHasMetadata === true ? $(`${this.POOL_ID}`) : $(`(${this.POOL_ID})[2]`);
  }

  async poolTicker(mode: string): Promise<WebdriverIO.Element> {
    return mode === 'extended' ? $(`${this.POOL_TICKER}`) : $(`${this.POOL_TICKER}/span[1]`);
  }

  async getAmountOfPoolIds(): Promise<WebdriverIO.ElementArray> {
    return $$(this.POOL_ID);
  }
}

export default new StakingConfirmationScreen();
