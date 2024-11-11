/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from './CommonDrawerElements';
import { browser } from '@wdio/globals';

class ActivityDetailsPage extends CommonDrawerElements {
  protected CONTAINER = '[data-testid="custom-drawer"]';
  private TRANSACTION_DETAILS = '[data-testid="transaction-detail"]';
  private TRANSACTION_DETAILS_SKELETON = '.ant-drawer-body .ant-skeleton';
  private TRANSACTION_DETAILS_HEADER = '[data-testid="tx-header"]';
  private TRANSACTION_DETAILS_DESCRIPTION = '[data-testid="tx-description"]';
  private TRANSACTION_DETAILS_DESCRIPTION_TYPE = '[data-testid="tx-description-type"]';
  private TRANSACTION_DETAILS_DESCRIPTION_TOOLTIP_ICON = '[data-testid="tx-description-tooltip-icon"]';
  private TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS = '[data-testid="tx-description-details"]';
  private TRANSACTION_DETAILS_BUNDLE = '[data-testid="tx-detail-bundle"]';
  private TRANSACTION_DETAILS_HASH_TITLE = '[data-testid="tx-hash-title"]';
  private TRANSACTION_DETAILS_HASH = '[data-testid="tx-hash-detail"]';
  private TRANSACTION_DETAILS_SUMMARY_TITLE = '[data-testid="summary-title"]';
  private TRANSACTION_DETAILS_TITLE = '[data-testid="tx-sent-title"]';
  private TRANSACTION_DETAILS_SENT = '[data-testid="tx-sent-detail"]';
  private TRANSACTION_DETAILS_SENT_TOKEN = '[data-testid="tx-sent-detail-token"]';
  private TRANSACTION_DETAILS_SENT_ADA = '[data-testid="tx-sent-detail-ada"]';
  private TRANSACTION_DETAILS_SENT_FIAT = '[data-testid="tx-sent-detail-fiat"]';
  private TRANSACTION_DETAILS_TO_ADDRESS_TITLE = '[data-testid="tx-to-from-title"]';
  private TRANSACTION_DETAILS_TO_ADDRESS = '[data-testid="tx-to-address"]';
  private TRANSACTION_DETAILS_TO_ADDRESS_TAG = '[data-testid="address-tag"]';
  private TRANSACTION_DETAILS_STATUS_TITLE = '[data-testid="tx-status-title"]';
  private TRANSACTION_DETAILS_STATUS = '[data-testid="tx-status"]';
  private TRANSACTION_DETAILS_TIMESTAMP_TITLE = '[data-testid="tx-timestamp-title"]';
  private TRANSACTION_DETAILS_TIMESTAMP = '[data-testid="tx-timestamp"]';
  private TRANSACTION_DETAILS_FEE_TITLE = '[data-testid="tx-amount-fee-label"]';
  private TRANSACTION_DETAILS_FEE_TITLE_TOOLTIP_ICON = '[data-testid="tx-amount-fee-tooltip-icon"]';
  private TRANSACTION_DETAILS_FEE_ADA = '[data-testid="tx-amount-fee-amount"]';
  private TRANSACTION_DETAILS_FEE_FIAT = '[data-testid="tx-amount-fee-fiat"]';
  private TRANSACTION_DETAILS_CERTIFICATES_SECTION = '[data-testid="certificates"]';
  private TRANSACTION_DETAILS_INPUTS_SECTION = '[data-testid="tx-inputs"]';
  private TRANSACTION_DETAILS_OUTPUTS_SECTION = '[data-testid="tx-outputs"]';
  private TRANSACTION_DETAILS_DROPDOWN = '[data-testid="tx-addr-list_toggle"]';

  private TRANSACTION_DETAILS_ADDRESS = '[data-testid="tx-address"]';
  private TRANSACTION_DETAILS_ADA_AMOUNT = '[data-testid="tx-ada-amount"]';
  private TRANSACTION_DETAILS_FIAT_AMOUNT = '[data-testid="tx-fiat-amount"]';
  private TRANSACTION_DETAILS_TOKEN = '[data-testid="tx-asset"]';
  private TRANSACTION_DETAILS_METADATA_SECTION = '[data-testid="tx-metadata-section"]';
  private TRANSACTION_DETAILS_METADATA_TITLE = '[data-testid="tx-metadata-title"]';
  private TRANSACTION_DETAILS_METADATA = '[data-testid="tx-metadata"]';

  private TRANSACTION_DETAILS_POOL_NAME = '[data-testid="tx-pool-name"]';
  private TRANSACTION_DETAILS_POOL_TICKER = '[data-testid="tx-pool-ticker"]';
  private TRANSACTION_STAKE_POOL_ID = '[data-testid="tx-pool-id"]';

  private TRANSACTION_DETAILS_REWARDS_TITLE = '[data-testid="rewards-detail-title"]';
  private TRANSACTION_DETAILS_REWARDS_TOTAL_ADA = '[data-testid="rewards-received-detail-ada"]';
  private TRANSACTION_DETAILS_REWARDS_TOTAL_FIAT = '[data-testid="rewards-received-detail-fiat"]';
  private TRANSACTION_DETAILS_REWARDS_POOLS_TITLE = '[data-testid="rewards-pools-title"]';
  private TRANSACTION_DETAILS_REWARDS_POOL_NAME = '[data-testid="rewards-pool-name"]';
  private TRANSACTION_DETAILS_REWARDS_POOL_TICKER = '[data-testid="rewards-pool-ticker"]';
  private TRANSACTION_DETAILS_REWARDS_POOL_ID = '[data-testid="rewards-pool-id"]';
  private TRANSACTION_DETAILS_REWARDS_SINGLE_POOL_ADA = '[data-testid="rewards-pool-reward-ada"]';
  private TRANSACTION_DETAILS_REWARDS_SINGLE_POOL_FIAT = '[data-testid="rewards-pool-reward-fiat"]';
  private TRANSACTION_DETAILS_REWARDS_STATUS_TITLE = '[data-testid="rewards-status-title"]';
  private TRANSACTION_DETAILS_REWARDS_STATUS = '[data-testid="rewards-status"]';
  private TRANSACTION_DETAILS_REWARDS_EPOCH_TITLE = '[data-testid="rewards-epoch-title"]';
  private TRANSACTION_DETAILS_REWARDS_EPOCH = '[data-testid="rewards-epoch"]';
  private TRANSACTION_DETAILS_REWARDS_TIMESTAMP_TITLE = '[data-testid="rewards-date-title"]';
  private TRANSACTION_DETAILS_REWARDS_TIMESTAMP = '[data-testid="rewards-timestamp"]';

  private TRANSACTION_DETAILS_DEPOSIT_TITLE = '[data-testid="deposit-value-title"]';
  private TRANSACTION_DETAILS_DEPOSIT_ADA_VALUE = '[data-testid="deposit-value-ada"]';
  private TRANSACTION_DETAILS_DEPOSIT_FIAT_VALUE = '[data-testid="deposit-value-fiat"]';

  get transactionDetailsSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SKELETON);
  }

  get transactionHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_HEADER);
  }

  get transactionDetails(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS);
  }

  get transactionDetailsStakePoolId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_STAKE_POOL_ID);
  }

  get transactionDetailsStakePoolIds(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_STAKE_POOL_ID);
  }

  get transactionDetailsHashTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_HASH_TITLE);
  }

  get transactionDetailsHash(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_HASH);
  }

  get transactionDetailsSummaryTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SUMMARY_TITLE);
  }

  get transactionDetailsDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION);
  }

  get transactionDetailsType(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION_TYPE);
  }

  get transactionDetailsTooltipIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION_TOOLTIP_ICON);
  }

  get transactionDetailsAmountOfTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS);
  }

  async transactionDetailsBundles(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE);
  }

  async transactionSentTokensForBundle(index = 0): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$$(this.TRANSACTION_DETAILS_SENT_TOKEN);
  }

  async transactionSentTokens(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_SENT_TOKEN);
  }

  transactionDetailsSentAda(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_SENT_ADA);
  }

  transactionDetailsSentFiat(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_SENT_FIAT);
  }

  transactionDetailsToAddressTitle(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_TO_ADDRESS_TITLE);
  }

  transactionDetailsToAddress(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_TO_ADDRESS);
  }

  transactionDetailsToAddressTag(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_TO_ADDRESS_TAG);
  }

  get transactionDetailsStatusTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_STATUS_TITLE);
  }

  get transactionDetailsStatus(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_STATUS);
  }

  get transactionDetailsTimestampTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_TIMESTAMP_TITLE);
  }

  get transactionDetailsTimestamp(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_TIMESTAMP);
  }

  get transactionDetailsFeeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_TITLE);
  }

  get transactionDetailsFeeTitleTooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_TITLE_TOOLTIP_ICON);
  }

  get transactionDetailsFeeADA(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_ADA);
  }

  get transactionDetailsOutputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION);
  }

  get transactionDetailsCertificatesSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_CERTIFICATES_SECTION);
  }

  get transactionDetailsInputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION);
  }

  get transactionDetailsFeeFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_FIAT);
  }

  get transactionDetailsInputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsOutputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsInputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsOutputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsInputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsOutputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsInputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsOutputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsInputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsOutputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsMetadataSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_METADATA_SECTION);
  }

  get transactionDetailsMetadataTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_METADATA_TITLE);
  }

  get transactionDetailsMetadata(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_METADATA);
  }

  get transactionDetailsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_TITLE);
  }

  get transactionDetailsSent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SENT);
  }

  get transactionDetailsStakepoolName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_POOL_NAME);
  }

  get transactionDetailsStakepoolNames(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_POOL_NAME);
  }

  get transactionDetailsStakepoolTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_POOL_TICKER);
  }

  get transactionDetailsStakepoolTickers(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_POOL_TICKER);
  }

  get transactionDetailsRewardsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_TITLE);
  }

  get transactionDetailsRewardsTotalAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_TOTAL_ADA);
  }

  get transactionDetailsRewardsTotalFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_TOTAL_FIAT);
  }

  get transactionDetailsRewardsPoolsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_POOLS_TITLE);
  }

  get transactionDetailsRewardsPoolNames(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_REWARDS_POOL_NAME);
  }

  get transactionDetailsRewardsPoolTickers(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_REWARDS_POOL_TICKER);
  }

  get transactionDetailsRewardsPoolIds(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_REWARDS_POOL_ID);
  }

  get transactionDetailsRewardsSinglePoolAda(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_REWARDS_SINGLE_POOL_ADA);
  }

  get transactionDetailsRewardsSinglePoolFiat(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_REWARDS_SINGLE_POOL_FIAT);
  }

  get transactionDetailsRewardsStatusTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_STATUS_TITLE);
  }

  get transactionDetailsRewardsStatus(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_STATUS);
  }

  get transactionDetailsRewardsEpochTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_EPOCH_TITLE);
  }

  get transactionDetailsRewardsEpoch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_EPOCH);
  }

  get transactionDetailsRewardsTimestampTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_TIMESTAMP_TITLE);
  }

  get transactionDetailsRewardsTimestamp(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_REWARDS_TIMESTAMP);
  }

  get transactionDetailsDepositTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DEPOSIT_TITLE);
  }

  get transactionDetailsDepositAdaValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DEPOSIT_ADA_VALUE);
  }

  get transactionDetailsDepositFiatValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DEPOSIT_FIAT_VALUE);
  }

  async getTransactionSentTokensForBundle(index = 0): Promise<string[]> {
    const array = await this.transactionSentTokensForBundle(index);
    return Promise.all(await array.map(async (element) => await element.getText()));
  }

  async getTransactionSentTokensWithoutDuplicates(): Promise<unknown[]> {
    const array = await this.transactionSentTokens();
    const arr = Promise.all(await array.map(async (element) => (await element.getText()).split(' ').pop()));
    return [...new Set(await arr)];
  }

  async closeActivityDetails(mode: 'extended' | 'popup'): Promise<void> {
    mode === 'popup' ? await this.clickHeaderBackButton() : await this.clickHeaderCloseButton();
  }

  async clickInputsDropdown(): Promise<void> {
    await this.transactionDetailsInputsDropdown.click();
  }

  async clickOutputsDropdown(): Promise<void> {
    await this.transactionDetailsOutputsDropdown.click();
  }

  async getTextValues(array: WebdriverIO.ElementArray): Promise<string[]> {
    const values: string[] = [];
    for (const pool of array) {
      values.push(await pool.getText());
    }
    return values;
  }

  async getTransactionDetailsStakepoolNames(): Promise<string[]> {
    return await this.getTextValues(await this.transactionDetailsStakepoolNames);
  }

  async getTransactionDetailsStakepoolTickers(): Promise<string[]> {
    const tickers = await this.getTextValues(await this.transactionDetailsStakepoolTickers);
    return tickers.map((s) => s.slice(1, -1));
  }

  async getTransactionDetailsStakepoolIds(): Promise<string[]> {
    return await this.getTextValues(await this.transactionDetailsStakePoolIds);
  }

  async waitUntilTxHashNotEmpty() {
    await browser.waitUntil(async () => (await this.transactionDetailsHash.getText()) !== '', {
      timeout: 6000,
      timeoutMsg: 'failed while waiting for tx hash value'
    });
  }
}

export default new ActivityDetailsPage();
