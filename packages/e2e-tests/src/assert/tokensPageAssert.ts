import TokensPage from '../elements/tokensPage';
import { TestnetPatterns } from '../support/patterns';
import MenuHeader from '../elements/menuHeader';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

type ExpectedTokenDetails = {
  name: string;
  ticker: string;
  value: number;
};

class TokensPageAssert {
  ADA_PRICE_CHECK_INTERVAL = 65_000;

  assertSeeTitle = async () => {
    await TokensPage.title.waitForDisplayed({ timeout: 10_000 });
  };

  assertSeeTitleWithCounter = async () => {
    await TokensPage.title.waitForDisplayed();
    await TokensPage.counter.waitForDisplayed();
    expect(await TokensPage.title.getText()).to.equal(await t('browserView.assets.title'));
    expect(await TokensPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertCounterNumberMatchesWalletTokens = async () => {
    const tokensCounterValue = Number((await TokensPage.counter.getText()).slice(1, -1));
    if (tokensCounterValue > 0) await TokensPage.coinGeckoCredits.scrollIntoView();
    await TokensPage.tokenRowSkeleton.waitForDisplayed({ reverse: true, timeout: 60_000 });
    const rowsNumber = (await TokensPage.getRows()).length;
    expect(rowsNumber).to.equal(tokensCounterValue);
  };

  assertSeeTotalWalletBalance = async () => {
    await TokensPage.totalBalanceLabel.waitForDisplayed();
    expect(await TokensPage.totalBalanceLabel.getText()).to.equal(await t('browserView.assets.totalWalletBalance'));
    expect(await TokensPage.totalBalanceCurrency.getText()).to.equal('USD');
    const actualTotalBalance = Number((await TokensPage.totalBalanceValue.getText()).replace(/,/g, ''));
    expect(actualTotalBalance).to.be.greaterThan(0);
  };

  assertSeeReceiveAndSendButtonsInHeader = async (shouldSee: boolean) => {
    await MenuHeader.sendButton.waitForDisplayed({ reverse: !shouldSee });
    await MenuHeader.receiveButton.waitForDisplayed({ reverse: !shouldSee });
  };

  assertSeeReceiveAndSendButtonsInPopupMode = async (shouldSee: boolean) => {
    await TokensPage.sendButtonPopupMode.waitForDisplayed({ reverse: !shouldSee });
    await TokensPage.receiveButtonPopupMode.waitForDisplayed({ reverse: !shouldSee });
  };

  assertSeeTableItems = async (mode: 'extended' | 'popup') => {
    await browser.waitUntil(async () => (await TokensPage.getRows()).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all tokens'
    });

    const rowsNumber = (await TokensPage.getRows()).length;

    for (let i = 0; i < rowsNumber; i++) {
      await TokensPage.tokensAvatar(i).waitForDisplayed();
      await TokensPage.tokenName(i).waitForDisplayed();
      await TokensPage.tokenTicker(i).waitForDisplayed();
      if (mode === 'extended') {
        await TokensPage.tokenPriceAda(i).waitForDisplayed();
        await TokensPage.tokenPriceChange(i).waitForDisplayed();
      }
      await TokensPage.tokenBalance(i).waitForDisplayed();
      await TokensPage.tokenFiatBalance(i).waitForDisplayed();
    }
  };

  assertSeeNativeToken = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    await this.assertSeeTokenItemBasicData(tokenName);
    await this.assertSeeTokenData(tokenName, true, mode);
  };

  assertSeeNotNativeToken = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    await this.assertSeeTokenItemBasicData(tokenName);
    await this.assertSeeTokenData(tokenName, false, mode);
  };

  assertSeeTokenItemBasicData = async (tokenName: Asset) => {
    const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenName.name);
    expect(await TokensPage.tokenName(tokensTableIndex).getText()).to.contain(tokenName.name);
    expect(await TokensPage.tokenTicker(tokensTableIndex).getText()).to.contain(tokenName.ticker);
    expect(await TokensPage.getTokenBalanceAsFloatByIndex(tokensTableIndex)).to.be.greaterThan(0);
  };

  assertSeeTokenData = async (tokenName: Asset, nativeToken: boolean, mode: 'extended' | 'popup') => {
    const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenName.name);
    const tokenValueFiat = (await TokensPage.getTokenFiatBalanceByIndex(tokensTableIndex)) as string;
    nativeToken
      ? expect(tokenValueFiat).to.match(TestnetPatterns.TOKEN_VALUE_FIAT_REGEX)
      : expect(tokenValueFiat).to.equal('-');
    if (mode === 'extended') {
      const tokenValuePriceAda = (await TokensPage.getTokenPriceAdaByIndex(tokensTableIndex)) as string;
      nativeToken
        ? expect(tokenValuePriceAda).to.match(TestnetPatterns.TOKEN_VALUE_ADA_REGEX)
        : expect(tokenValuePriceAda).to.equal('-');
      const tokenValuePriceChange = (await TokensPage.getTokenPriceChangeByIndex(tokensTableIndex)) as string;
      nativeToken
        ? expect(tokenValuePriceChange).to.match(TestnetPatterns.TOKEN_PRICE_CHANGE)
        : expect(tokenValuePriceChange).to.equal('-');
    }
  };

  async assertSeeToken(shouldSee: boolean, tokenDetails: ExpectedTokenDetails, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await TokensPage.tokensTableItemWithName(tokenDetails.name).waitForDisplayed({ timeout: 10_000 });
      expect(await TokensPage.getTokenNames()).to.contain(tokenDetails.name);
      expect(await TokensPage.getTokenTickers()).to.contain(tokenDetails.ticker);
      const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenDetails.name);
      const tokenBalance = await TokensPage.getTokenBalanceAsFloatByIndex(tokensTableIndex);
      expect(tokenBalance).to.equal(tokenDetails.value);
      if (mode === 'extended') {
        await TokensPage.tokenPriceAda(tokensTableIndex).waitForDisplayed();
        await TokensPage.tokenPriceChange(tokensTableIndex).waitForDisplayed();
      }
    } else {
      expect(await TokensPage.getTokenNames()).to.not.contain(tokenDetails.name);
      expect(await TokensPage.getTokenTickers()).to.not.contain(tokenDetails.ticker);
    }
  }

  async assertSeeValueSubtractedAda(tokenName: string, subtractedAmount: string, fee: string) {
    const expectedValue =
      Number.parseFloat(await testContext.load(`${Asset.getByName(tokenName)?.ticker}tokenBalance`)) -
      Number.parseFloat(subtractedAmount) -
      Number.parseFloat(fee);
    const expectedValueRounded = Number.parseFloat(expectedValue.toFixed(2));
    Logger.log(`waiting for token: ${tokenName} with value: ${expectedValueRounded}`);
    await browser.waitUntil(
      async () => {
        const tokenValueAsFloat = await TokensPage.getTokenBalanceAsFloatByName(tokenName);
        return (
          tokenValueAsFloat === expectedValueRounded + 0.01 ||
          tokenValueAsFloat === expectedValueRounded - 0.01 ||
          tokenValueAsFloat === expectedValueRounded
        );
      },
      {
        timeout: 120_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for ${tokenName} value update`
      }
    );
  }

  async assertSeeValueSubtractedAsset(tokenName: string, subtractedAmount: string) {
    const expectedValue =
      Number.parseFloat(await testContext.load(`${Asset.getByName(tokenName)?.ticker}tokenBalance`)) -
      Number.parseFloat(subtractedAmount);
    const expectedValueRounded = Number.parseFloat(expectedValue.toFixed(2));
    Logger.log(`waiting for token: ${tokenName} with value: ${expectedValueRounded}`);
    await browser.waitUntil(
      async () => (await TokensPage.getTokenBalanceAsFloatByName(tokenName)) === expectedValueRounded,
      {
        timeout: 30_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for ${tokenName} value update`
      }
    );
  }

  async assertSeeCoinGeckoCredits(shouldSee: boolean) {
    await TokensPage.coinGeckoCredits.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      const expectedCredits = `${await t('general.credit.poweredBy')}\n${await t('general.credit.coinGecko')}`;
      expect(await TokensPage.coinGeckoCredits.getText()).to.equal(expectedCredits);
      expect(await TokensPage.coinGeckoLink.isEnabled()).to.be.true;
    }
  }

  async assertSeeCoinGeckoURL() {
    const COINGECKO_URL = 'https://www.coingecko.com';
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(COINGECKO_URL);
  }

  async assertDoNotSeeEyeIcon() {
    await TokensPage.closedEyeIcon.waitForDisplayed({ reverse: true });
    await TokensPage.openedEyeIcon.waitForDisplayed({ reverse: true });
  }

  async assertSeeClosedEyeIcon() {
    await TokensPage.closedEyeIcon.waitForDisplayed();
  }

  async assertSeeOpenedEyeIcon() {
    await TokensPage.openedEyeIcon.waitForDisplayed();
  }

  async assertTotalWalletBalanceIsMasked() {
    expect(await TokensPage.totalBalanceValue.getText()).to.equal('********');
  }

  async assertTokenBalancesIsMasked(tokenIndex: number, shouldBeMasked: boolean) {
    await TokensPage.tokenBalance(tokenIndex).waitForDisplayed();
    shouldBeMasked
      ? expect(await TokensPage.tokenBalance(tokenIndex).getText()).to.equal('********')
      : expect(await TokensPage.tokenBalance(tokenIndex).getText()).to.not.equal('********');
  }

  async assertTokenFiatBalancesIsMasked(tokenIndex: number, shouldBeMasked: boolean) {
    await TokensPage.tokenFiatBalance(tokenIndex).waitForDisplayed();
    shouldBeMasked
      ? expect(await TokensPage.tokenFiatBalance(tokenIndex).getText()).to.equal('********')
      : expect(await TokensPage.tokenFiatBalance(tokenIndex).getText()).to.not.equal('********');
  }

  async assertAllBalancesAreMasked(shouldBeMasked: boolean) {
    const rowsCounter = (await TokensPage.getRows()).length;
    if (rowsCounter > 0) await TokensPage.coinGeckoCredits.scrollIntoView();
    for (let i = 0; i < rowsCounter; i++) {
      await this.assertTokenBalancesIsMasked(i, shouldBeMasked);
      await this.assertTokenFiatBalancesIsMasked(i, shouldBeMasked);
    }
  }

  async assertAdaBalance(balanceInAda: number) {
    await this.assertTokenBalance(0, balanceInAda);
  }

  async assertTMinBalance(balance: number) {
    const TMinIndex = await TokensPage.getTokenRowIndex('tMIN');
    await this.assertTokenBalance(TMinIndex, balance);
  }

  async assertTokenBalance(tokenIndex: number, tokenBalance: number) {
    const balance = Number((await TokensPage.tokenBalance(tokenIndex).getText()).replace(',', ''));
    expect(balance).to.equal(Number(tokenBalance));
  }

  async assertSeeTicker(expectedTicker: 'ADA' | 'tADA') {
    const tickers = await TokensPage.getTokenTickers();
    const tickerDisplayed = tickers[await TokensPage.getTokenRowIndex('Cardano')];

    expect(tickerDisplayed).to.equal(expectedTicker);
  }

  async seePriceFetchExpiredErrorMessage(shouldBeVisible: boolean) {
    await TokensPage.priceFetchErrorDescription.waitForDisplayed({
      reverse: !shouldBeVisible,
      timeout: this.ADA_PRICE_CHECK_INTERVAL * 3
    });
    if (shouldBeVisible) {
      const expiredErrorMessageToMatch = (await t('general.warnings.priceDataExpired')).split(':')[0];
      expect(await TokensPage.priceFetchErrorDescription.getText())
        .to.include(expiredErrorMessageToMatch)
        .to.include(new Date().getFullYear())
        .to.include(new Date().getDate())
        .to.include(new Date().getMinutes());
    }
  }

  async seePriceFetchFailedErrorMessage(shouldBeVisible: boolean) {
    await TokensPage.priceFetchErrorDescription.waitForDisplayed({
      reverse: !shouldBeVisible,
      timeout: this.ADA_PRICE_CHECK_INTERVAL * 3
    });
    if (shouldBeVisible)
      expect(await TokensPage.priceFetchErrorDescription.getText()).to.equal(
        await t('general.warnings.cannotFetchPrice')
      );
  }
}

export default new TokensPageAssert();
