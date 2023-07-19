import TokensPage from '../elements/tokensPage';
import { TestnetPatterns } from '../support/patterns';
import MenuHeader from '../elements/menuHeader';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import Banner from '../elements/banner';
import { getBackgroundStorageItem } from '../utils/browserStorage';

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
    await expect(await TokensPage.title.getText()).to.equal(await t('browserView.assets.title'));
    await expect(await TokensPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertCounterNumberMatchesWalletTokens = async () => {
    const tokensCounterValue = Number((await TokensPage.counter.getText()).slice(1, -1));
    if (tokensCounterValue > 0) await TokensPage.coinGeckoCredits.scrollIntoView();
    await browser.pause(1000);
    const rowsNumber = (await TokensPage.getRows()).length;
    await expect(rowsNumber).to.equal(tokensCounterValue);
  };

  assertSeeTotalWalletBalance = async () => {
    await TokensPage.totalBalanceLabel.waitForDisplayed();
    await expect(await TokensPage.totalBalanceLabel.getText()).to.equal(
      await t('browserView.assets.totalWalletBalance')
    );
    await expect(await TokensPage.totalBalanceCurrency.getText()).to.equal('USD');
    const actualTotalBalance = Number((await TokensPage.totalBalanceValue.getText()).replace(/,/g, ''));
    await expect(actualTotalBalance).to.be.greaterThan(0);
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
    await this.assertSeeNativeTokenData(tokenName, mode);
  };

  assertSeeNotNativeToken = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    await this.assertSeeTokenItemBasicData(tokenName);
    await this.assertSeeNonNativeTokenData(tokenName, mode);
  };

  assertSeeTokenItemBasicData = async (tokenName: Asset) => {
    await expect(await TokensPage.getTokenNames()).to.contain(tokenName.name);
    await expect(await TokensPage.getTokenTickers()).to.contain(tokenName.ticker);
    const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenName.name);
    const tokenBalanceValue = await TokensPage.getTokenBalanceAsFloatByIndex(tokensTableIndex);
    await expect(tokenBalanceValue).to.be.greaterThan(0);
  };

  assertSeeNativeTokenData = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenName.name);
    const tokenValueFiat = (await TokensPage.getTokenFiatBalanceByIndex(tokensTableIndex)) as string;
    await expect(tokenValueFiat).to.match(TestnetPatterns.TOKEN_VALUE_FIAT_REGEX);
    if (mode === 'extended') {
      const tokenValuePriceAda = (await TokensPage.getTokenPriceAdaByIndex(tokensTableIndex)) as string;
      await expect(tokenValuePriceAda).to.match(TestnetPatterns.TOKEN_VALUE_ADA_REGEX);
      const tokenValuePriceChange = (await TokensPage.getTokenPriceChangeByIndex(tokensTableIndex)) as string;
      await expect(tokenValuePriceChange).to.match(TestnetPatterns.TOKEN_PRICE_CHANGE);
    }
  };

  assertSeeNonNativeTokenData = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenName.name);
    const tokenValueFiat = await TokensPage.getTokenFiatBalanceByIndex(tokensTableIndex);
    await expect(tokenValueFiat).to.equal('-');
    if (mode === 'extended') {
      const tokenValuePriceAda = await TokensPage.getTokenPriceAdaByIndex(tokensTableIndex);
      await expect(tokenValuePriceAda).to.equal('-');
      const tokenValuePriceChange = await TokensPage.getTokenPriceChangeByIndex(tokensTableIndex);
      await expect(tokenValuePriceChange).to.equal('-');
    }
  };

  async assertSeeToken(shouldSee: boolean, tokenDetails: ExpectedTokenDetails, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await TokensPage.tokensTableItemWithName(tokenDetails.name).waitForDisplayed({ timeout: 10_000 });
      await expect(await TokensPage.getTokenNames()).to.contain(tokenDetails.name);
      await expect(await TokensPage.getTokenTickers()).to.contain(tokenDetails.ticker);
      const tokensTableIndex = await TokensPage.getTokenRowIndex(tokenDetails.name);
      const tokenBalance = await TokensPage.getTokenBalanceAsFloatByIndex(tokensTableIndex);
      await expect(tokenBalance).to.equal(tokenDetails.value);
      if (mode === 'extended') {
        await TokensPage.tokenPriceAda(tokensTableIndex).waitForDisplayed();
        await TokensPage.tokenPriceChange(tokensTableIndex).waitForDisplayed();
      }
    } else {
      await expect(await TokensPage.getTokenNames()).to.not.contain(tokenDetails.name);
      await expect(await TokensPage.getTokenTickers()).to.not.contain(tokenDetails.ticker);
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
      async () =>
        (await TokensPage.getTokenBalanceAsFloatByName(tokenName)) === expectedValueRounded + 0.01 ||
        (await TokensPage.getTokenBalanceAsFloatByName(tokenName)) === expectedValueRounded - 0.01 ||
        (await TokensPage.getTokenBalanceAsFloatByName(tokenName)) === expectedValueRounded,
      {
        timeout: 30_000,
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
      await expect(await TokensPage.coinGeckoCredits.getText()).to.equal(expectedCredits);
      await expect(await TokensPage.coinGeckoLink.isEnabled()).to.be.true;
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
    await expect(await TokensPage.totalBalanceValue.getText()).to.equal('********');
  }

  async assertTokenBalancesIsMasked(tokenIndex: number, shouldBeMasked: boolean) {
    await TokensPage.tokenBalance(tokenIndex).waitForDisplayed();
    await (shouldBeMasked
      ? expect(await TokensPage.tokenBalance(tokenIndex).getText()).to.equal('********')
      : expect(await TokensPage.tokenBalance(tokenIndex).getText()).to.not.equal('********'));
  }

  async assertTokenFiatBalancesIsMasked(tokenIndex: number, shouldBeMasked: boolean) {
    await TokensPage.tokenFiatBalance(tokenIndex).waitForDisplayed();
    await (shouldBeMasked
      ? expect(await TokensPage.tokenFiatBalance(tokenIndex).getText()).to.equal('********')
      : expect(await TokensPage.tokenFiatBalance(tokenIndex).getText()).to.not.equal('********'));
  }

  async assertAllBalancesAreMasked(shouldBeMasked: boolean) {
    const rowsCounter = (await TokensPage.getRows()).length;
    if (rowsCounter > 0) await TokensPage.coinGeckoCredits.scrollIntoView();
    for (let i = 0; i < rowsCounter; i++) {
      await this.assertTokenBalancesIsMasked(i, shouldBeMasked);
      await this.assertTokenFiatBalancesIsMasked(i, shouldBeMasked);
    }
  }

  async seePriceFetchExpiredErrorMessage() {
    await TokensPage.getPriceFetchErrorDescription.waitForDisplayed({ timeout: this.ADA_PRICE_CHECK_INTERVAL * 3 });
    const expiredErrorMessageToMatch = (await t('general.warnings.priceDataExpired')).split(':')[0];
    await expect(await TokensPage.getPriceFetchErrorDescription.getText()).to.include(expiredErrorMessageToMatch);
  }

  async seePriceFetchFailedErrorMessage() {
    await TokensPage.getPriceFetchErrorDescription.waitForDisplayed({ timeout: this.ADA_PRICE_CHECK_INTERVAL });
    await expect(await TokensPage.getPriceFetchErrorDescription.getText()).to.equal(
      await t('general.warnings.cannotFetchPrice')
    );
  }

  async seePriceFetchExpiredErrorMessageInTokenDetailsScreen() {
    const expiredErrorMessageToMatch = (await t('general.warnings.priceDataExpired')).split('.')[0];
    await expect(await Banner.getContainerText()).to.include(expiredErrorMessageToMatch);
  }

  async assertFiatPricesAreInLocalStorage() {
    let fiatPrices = await getBackgroundStorageItem('fiatPrices');
    if (!fiatPrices) {
      await TokensPage.waitForPricesToBeFetched();
      fiatPrices = await getBackgroundStorageItem('fiatPrices');
    }
    expect(fiatPrices, 'ADA Fiat price is not in local storage').is.not.undefined;
  }
}

export default new TokensPageAssert();
