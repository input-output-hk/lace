import TransactionsPage from '../elements/transactionsPage';
import TransactionDetailsPage from '../elements/transactionDetails';
import { expect } from 'chai';
import testContext from '../utils/testContext';
import { browser } from '@wdio/globals';
import { t } from '../utils/translationService';
import { TransactionType } from '../types/transactionType';
import { TestnetPatterns } from '../support/patterns';

export type ExpectedActivityDetails = {
  transactionDescription: string;
  hash?: string;
  transactionData?: TransactionData[];
  status: string;
  poolData?: PoolData[];
};

export type PoolData = {
  poolName: string;
  poolTicker: string;
  poolId: string;
};

export type AddressTag = 'own' | 'foreign';

export type TransactionData = {
  address: string;
  addressTag?: AddressTag;
  ada: string;
  assets?: string[];
};

const stakeKeyRegistration = 'Stake Key Registration';
const headerTranslationKey = 'core.activityDetails.header';

class TransactionsDetailsAssert {
  waitForTransactionsLoaded = async () => {
    await browser.waitUntil(async () => (await TransactionsPage.rows).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all transactions'
    });
  };

  async assertSeeActivityDetailsDrawer(shouldBeDisplayed: boolean) {
    await TransactionDetailsPage.transactionDetails.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await TransactionDetailsPage.transactionHeader.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await TransactionDetailsPage.transactionDetails.waitForStable();
      expect(await TransactionDetailsPage.transactionHeader.getText()).to.equal(await t(headerTranslationKey));
    }
  }

  async assertSeeActivityDetails(expectedActivityDetails: ExpectedActivityDetails) {
    await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });

    expect(await TransactionDetailsPage.transactionDetailsDescription.getText()).contains(
      `${expectedActivityDetails.transactionDescription}`
    );
    if (expectedActivityDetails.hash) {
      expect(await TransactionDetailsPage.transactionDetailsHash.getText()).to.equal(
        String(expectedActivityDetails.hash)
      );
    }
    expect(await TransactionDetailsPage.transactionDetailsStatus.getText()).to.equal(expectedActivityDetails.status);
    if (expectedActivityDetails.transactionData) {
      for (let i = 0; i < expectedActivityDetails.transactionData.length; i++) {
        if (expectedActivityDetails.transactionData[i].assets) {
          const actualAssets = await TransactionDetailsPage.getTransactionSentTokensForBundle(i);
          expect(actualAssets.toString()).to.equal(String(expectedActivityDetails.transactionData[i].assets));
        }
        expect(await TransactionDetailsPage.transactionDetailsSentAda(i).getText()).to.equal(
          expectedActivityDetails.transactionData[i].ada
        );

        const expectedAddress = expectedActivityDetails.transactionData[i].address;
        const actualAddressSplit = (await TransactionDetailsPage.transactionDetailsToAddress(i).getText()).split('...');
        if (actualAddressSplit.length === 1) {
          expect(expectedAddress).to.equal(actualAddressSplit[0]);
        } else {
          expect(expectedAddress.startsWith(actualAddressSplit[0])).to.be.true;
          expect(expectedAddress.endsWith(actualAddressSplit[1])).to.be.true;
        }

        if (expectedActivityDetails.transactionData[i].addressTag) {
          const actualAddressTag = await TransactionDetailsPage.transactionDetailsToAddressTag(i).getText();
          expect(expectedActivityDetails.transactionData[i].addressTag).to.equal(actualAddressTag);
        }
      }
    }

    if (expectedActivityDetails.poolData) {
      await this.verifyPoolsData(expectedActivityDetails.poolData);
    }
  }

  async verifyPoolsData(poolData: PoolData[]) {
    const expectedIds: string[] = [];
    const expectedNames: string[] = [];
    const expectedTickers: string[] = [];

    for (const pool of poolData) {
      expectedIds.push(pool.poolId);
      expectedNames.push(pool.poolName);
      expectedTickers.push(pool.poolTicker);
    }

    await TransactionDetailsPage.transactionDetails.waitForStable();
    const actualIds: string[] = await TransactionDetailsPage.getTransactionDetailsStakepoolIds();
    const actualNames: string[] = await TransactionDetailsPage.getTransactionDetailsStakepoolNames();
    const actualTickers: string[] = await TransactionDetailsPage.getTransactionDetailsStakepoolTickers();
    if (actualIds[0].endsWith(expectedTickers[0].split('...')[1])) expectedTickers[0] = '-';

    expect(actualIds).to.have.all.members(expectedIds);
    expect(actualNames).to.have.all.members(expectedNames);
    expect(actualTickers).to.have.all.members(expectedTickers);
  }

  async assertSeeActivityDetailsUnfolded(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      const txType = await TransactionDetailsPage.transactionDetailsDescription.getText();
      if (
        !txType.includes(stakeKeyRegistration) &&
        !txType.includes('Rewards') &&
        !txType.includes('Stake Key De-registration')
      ) {
        await TransactionDetailsPage.transactionDetailsFeeADA.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsFeeFiat.waitForDisplayed();
      }
      if (txType.includes('Delegation')) {
        await TransactionDetailsPage.transactionDetailsStakepoolName.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsStakepoolTicker.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsStakePoolId.waitForDisplayed();
      }
      if (!txType.includes('Rewards')) {
        await TransactionDetailsPage.transactionDetailsTimestamp.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsInputsSection.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsOutputsSection.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsStatus.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsHash.waitForDisplayed();
      }

      await TransactionDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsInputAndOutputs(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      if ((await TransactionDetailsPage.transactionDetailsDescription.getText()) !== 'Rewards') {
        await TransactionDetailsPage.transactionDetailsInputsDropdown.click();
        await TransactionDetailsPage.transactionDetailsOutputsDropdown.click();
        await TransactionDetailsPage.transactionDetailsInputAddress.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsInputAdaAmount.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsInputFiatAmount.waitForDisplayed();
        // TODO refactor steps below
        //  some transactions (ADA only) don't have this field
        // await TransactionDetailsPage.transactionDetailsInputTokens.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsOutputAddress.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsOutputAdaAmount.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsOutputFiatAmount.waitForDisplayed();
        // await TransactionDetailsPage.transactionDetailsOutputTokens.waitForDisplayed();
      }
      await TransactionDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertTxDetailValuesNotZero(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      if ((await TransactionDetailsPage.transactionDetailsDescription.getText()) !== 'Rewards') {
        await TransactionDetailsPage.transactionDetailsInputsDropdown.click();
        await TransactionDetailsPage.transactionDetailsInputsDropdown.waitForStable();
        await TransactionDetailsPage.transactionDetailsOutputsDropdown.click();
        await TransactionDetailsPage.transactionDetailsOutputsDropdown.waitForStable();

        const txDetailsInputADAValueString = await TransactionDetailsPage.transactionDetailsInputAdaAmount.getText();
        const txDetailsInputADAValue = Number(txDetailsInputADAValueString.split(' ', 1));
        const txType = await TransactionDetailsPage.transactionDetailsDescription.getText();

        const txDetailsInputFiatValueString = await TransactionDetailsPage.transactionDetailsInputFiatAmount.getText();
        const txDetailsInputFiatValue = Number(txDetailsInputFiatValueString.slice(1).split(' ', 1));

        const txDetailsOutputADAValueString = await TransactionDetailsPage.transactionDetailsOutputAdaAmount.getText();
        const txDetailsOutputADAValue = Number(txDetailsOutputADAValueString.split(' ', 1));

        const txDetailsOutputFiatValueString =
          await TransactionDetailsPage.transactionDetailsOutputFiatAmount.getText();
        const txDetailsOutputFiatValue = Number(txDetailsOutputFiatValueString.slice(1).split(' ', 1));

        if (!txType.includes(stakeKeyRegistration)) {
          const txDetailsFeeADAValueString = await TransactionDetailsPage.transactionDetailsFeeADA.getText();
          const txDetailsFeeADAValue = Number(txDetailsFeeADAValueString.split(' ', 1));
          expect(txDetailsFeeADAValue).to.be.greaterThan(0);

          const txDetailsFeeFiatValueString = await TransactionDetailsPage.transactionDetailsFeeFiat.getText();
          const txDetailsFeeFiatValue = Number(txDetailsFeeFiatValueString.slice(1).split(' ', 1));
          expect(txDetailsFeeFiatValue).to.be.greaterThan(0);
        }

        expect(txDetailsInputADAValue).to.be.greaterThan(0);
        expect(txDetailsInputFiatValue).to.be.greaterThan(0);
        expect(txDetailsOutputADAValue).to.be.greaterThan(0);
        expect(txDetailsOutputFiatValue).to.be.greaterThan(0);
      }
      await TransactionDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsSummary(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      const transactionType = await TransactionsPage.transactionsTableItemType(i).getText();
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      if (
        // eslint-disable-next-line sonarjs/no-duplicate-string
        !['Delegation', 'Stake Key De-Registration', 'Stake Key Registration', 'Self Transaction', 'Rewards'].includes(
          transactionType
        )
      ) {
        await TransactionDetailsPage.transactionDetailsSent.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsToAddress(0).waitForDisplayed();
      }

      await TransactionDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsSummaryAmounts(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      const skippedTransaction = ['Self Transaction', 'Rewards']; // should be covered in separate tests
      if (!skippedTransaction.includes(await TransactionsPage.transactionsTableItemType(i).getText())) {
        await TransactionsPage.clickOnTransactionRow(i);
        await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
        const txType = (await TransactionDetailsPage.transactionDetailsDescription.getText()).split('\n')[0];
        if (!['Delegation', stakeKeyRegistration].includes(txType)) {
          const tokensAmountSummary =
            (await TransactionDetailsPage.getTransactionSentTokensWithoutDuplicates()).length + 1;
          let tokensDescriptionAmount = await TransactionDetailsPage.transactionDetailsAmountOfTokens.getText();
          tokensDescriptionAmount = tokensDescriptionAmount.replace('(', '').replace(')', '');
          expect(tokensAmountSummary).to.equal(Number(tokensDescriptionAmount));
        }

        await TransactionDetailsPage.closeActivityDetails(mode);
      }
    }
  }

  async assertTxMetadata() {
    const currentMetadata = await TransactionDetailsPage.transactionDetailsMetadata.getText();
    expect(currentMetadata).to.equal(testContext.load('metadata'));
  }

  // eslint-disable-next-line max-statements
  async assertSeeSentReceivedSelfTransactionDetails(txType: 'Sent' | 'Received' | 'Self') {
    expect(await TransactionDetailsPage.transactionDetailsType.getText()).to.equal(txType);
    let tokensDescriptionAmount = await TransactionDetailsPage.transactionDetailsAmountOfTokens.getText();
    tokensDescriptionAmount = tokensDescriptionAmount.replace('(', '').replace(')', '');
    expect(Number(tokensDescriptionAmount)).to.be.greaterThan(0);
    await TransactionDetailsPage.transactionHeader.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionHeader.getText()).to.equal(await t(headerTranslationKey));

    await TransactionDetailsPage.transactionDetailsHashTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsHashTitle.getText()).to.equal(
      await t('core.activityDetails.transactionID')
    );
    await TransactionDetailsPage.transactionDetailsHash.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsHash.getText()).not.to.be.empty;

    await TransactionDetailsPage.transactionDetailsSummaryTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsSummaryTitle.getText()).to.equal(
      await t('core.activityDetails.summary')
    );

    if (txType !== 'Self') {
      const bundlesCount = (await TransactionDetailsPage.transactionDetailsBundles()).length;
      expect(bundlesCount).to.be.greaterThan(0);

      await TransactionDetailsPage.transactionDetailsTitle.waitForDisplayed();
      expect(await TransactionDetailsPage.transactionDetailsTitle.getText()).to.equal(
        txType === 'Received' ? await t('core.activityDetails.received') : await t('core.activityDetails.sent')
      );

      for (let i = 0; i < bundlesCount; i++) {
        await TransactionDetailsPage.transactionDetailsSentAda(i).waitForDisplayed();
        expect(await TransactionDetailsPage.transactionDetailsSentAda(i).getText()).to.match(
          TestnetPatterns.ADA_LITERAL_VALUE_REGEX
        );
        await TransactionDetailsPage.transactionDetailsSentFiat(i).waitForDisplayed();
        expect(await TransactionDetailsPage.transactionDetailsSentFiat(i).getText()).to.match(
          TestnetPatterns.USD_VALUE_REGEX
        );

        await TransactionDetailsPage.transactionDetailsToAddressTitle(i).waitForDisplayed();
        expect(await TransactionDetailsPage.transactionDetailsToAddressTitle(i).getText()).to.equal(
          txType === 'Received' ? await t('core.activityDetails.from') : await t('core.activityDetails.to')
        );

        await TransactionDetailsPage.transactionDetailsToAddress(i).waitForDisplayed();
        expect(await TransactionDetailsPage.transactionDetailsToAddress(i).getText()).not.to.be.empty;

        await TransactionDetailsPage.transactionDetailsToAddressTag(i).waitForDisplayed();
        expect(await TransactionDetailsPage.transactionDetailsToAddressTag(i).getText()).to.be.oneOf([
          await t('core.addressTags.foreign'),
          await t('core.addressTags.own')
        ]);
      }
    }

    await TransactionDetailsPage.transactionDetailsStatusTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsStatusTitle.getText()).to.equal(
      await t('core.activityDetails.status')
    );

    await TransactionDetailsPage.transactionDetailsTimestampTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsTimestampTitle.getText()).to.equal(
      await t('core.activityDetails.timestamp')
    );
    await TransactionDetailsPage.transactionDetailsTimestamp.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsTimestamp.getText()).not.to.be.empty;

    await TransactionDetailsPage.transactionDetailsFeeTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsFeeTitle.getText()).to.equal(
      await t('core.activityDetails.transactionFee')
    );
    await TransactionDetailsPage.transactionDetailsFeeTitleTooltip.waitForDisplayed();

    await TransactionDetailsPage.transactionDetailsFeeADA.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsFeeADA.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
    await TransactionDetailsPage.transactionDetailsFeeFiat.waitForDisplayed();

    expect(await TransactionDetailsPage.transactionDetailsFeeFiat.getText()).to.match(TestnetPatterns.USD_VALUE_REGEX);

    await TransactionDetailsPage.transactionDetailsInputsSection.waitForDisplayed();
    await TransactionDetailsPage.transactionDetailsOutputsSection.waitForDisplayed();

    if (await TransactionDetailsPage.transactionDetailsMetadataTitle.isDisplayed()) {
      expect(await TransactionDetailsPage.transactionDetailsMetadataTitle.getText()).to.equal(
        await t('core.activityDetails.metadata')
      );
      await TransactionDetailsPage.transactionDetailsMetadata.waitForDisplayed();
    }
  }

  // eslint-disable-next-line max-statements
  async assertSeeRewardsTransactionDetails() {
    expect(await TransactionDetailsPage.transactionDetailsType.getText()).to.equal(
      await t('core.activityDetails.rewards')
    );
    await TransactionDetailsPage.transactionDetailsTooltipIcon.waitForDisplayed();

    await TransactionDetailsPage.transactionHeader.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionHeader.getText()).to.equal(await t(headerTranslationKey));

    await TransactionDetailsPage.transactionDetailsSummaryTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsSummaryTitle.getText()).to.equal(
      await t('core.activityDetails.summary')
    );

    await TransactionDetailsPage.transactionDetailsRewardsTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsTitle.getText()).to.equal(
      await t('core.activityDetails.rewards')
    );
    await TransactionDetailsPage.transactionDetailsRewardsTotalAda.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsTotalAda.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
    await TransactionDetailsPage.transactionDetailsRewardsTotalFiat.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsTotalFiat.getText()).to.match(
      TestnetPatterns.USD_VALUE_REGEX
    );

    await TransactionDetailsPage.transactionDetailsRewardsPoolsTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsPoolsTitle.getText()).to.equal(
      await t('core.activityDetails.pools')
    );

    expect((await TransactionDetailsPage.transactionDetailsRewardsPoolNames).length).is.greaterThan(0);
    for (const name of await TransactionDetailsPage.transactionDetailsRewardsPoolNames) {
      await name.waitForDisplayed();
      expect(await name.getText()).not.to.be.empty;
    }

    expect((await TransactionDetailsPage.transactionDetailsRewardsPoolTickers).length).is.greaterThan(0);
    for (const ticker of await TransactionDetailsPage.transactionDetailsRewardsPoolTickers) {
      await ticker.waitForDisplayed();
      expect(await ticker.getText()).not.to.be.empty;
    }

    expect((await TransactionDetailsPage.transactionDetailsRewardsPoolIds).length).is.greaterThan(0);
    for (const poolId of await TransactionDetailsPage.transactionDetailsRewardsPoolIds) {
      await poolId.waitForDisplayed();
      expect(await poolId.getText()).not.to.be.empty;
    }

    expect((await TransactionDetailsPage.transactionDetailsRewardsSinglePoolAda).length).is.greaterThan(0);
    for (const singlePoolAdaReward of await TransactionDetailsPage.transactionDetailsRewardsSinglePoolAda) {
      await singlePoolAdaReward.waitForDisplayed();
      expect(await singlePoolAdaReward.getText()).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
    }

    expect((await TransactionDetailsPage.transactionDetailsRewardsSinglePoolFiat).length).is.greaterThan(0);
    for (const singlePoolFiatReward of await TransactionDetailsPage.transactionDetailsRewardsSinglePoolFiat) {
      await singlePoolFiatReward.waitForDisplayed();
      expect(await singlePoolFiatReward.getText()).to.match(TestnetPatterns.USD_VALUE_REGEX);
    }

    await TransactionDetailsPage.transactionDetailsRewardsStatusTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsStatusTitle.getText()).to.equal(
      await t('core.activityDetails.status')
    );
    await TransactionDetailsPage.transactionDetailsRewardsStatus.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsStatus.getText()).to.be.oneOf([
      'Spendable',
      'Success',
      'Sending',
      'Error'
    ]);

    await TransactionDetailsPage.transactionDetailsRewardsEpochTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsEpochTitle.getText()).to.equal(
      await t('core.activityDetails.epoch')
    );
    await TransactionDetailsPage.transactionDetailsRewardsEpoch.waitForDisplayed();
    expect(Number(await TransactionDetailsPage.transactionDetailsRewardsEpoch.getText())).to.be.greaterThan(0);

    await TransactionDetailsPage.transactionDetailsRewardsTimestampTitle.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsTimestampTitle.getText()).to.equal(
      await t('core.activityDetails.timestamp')
    );
    await TransactionDetailsPage.transactionDetailsRewardsTimestamp.waitForDisplayed();
    expect(await TransactionDetailsPage.transactionDetailsRewardsTimestamp.getText()).not.to.be.empty;
  }

  async assertSeeTransactionDetailsDrawer(txType: TransactionType) {
    await this.assertSeeActivityDetailsDrawer(true);
    switch (txType) {
      case 'Sent':
        await this.assertSeeSentReceivedSelfTransactionDetails('Sent');
        break;
      case 'Received':
        await this.assertSeeSentReceivedSelfTransactionDetails('Received');
        break;
      case 'Self Transaction':
        await this.assertSeeSentReceivedSelfTransactionDetails('Self');
        break;
      case 'Rewards':
        await this.assertSeeRewardsTransactionDetails();
        break;
      default:
        throw new Error(`Unknown tx type ${txType}`);
    }
  }
}

export default new TransactionsDetailsAssert();
