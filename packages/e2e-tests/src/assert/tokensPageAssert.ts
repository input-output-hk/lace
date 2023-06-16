import { TokensPage } from '../elements/tokensPage';
import { TestnetPatterns } from '../support/patterns';
import webTester from '../actor/webTester';
import MenuHeader from '../elements/menuHeader';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import Banner from '../elements/banner';

type ExpectedTokenDetails = {
  name: string;
  ticker: string;
  value: number;
};

class TokensPageAssert {
  assertSeeTitle = async () => {
    const tokensPage = new TokensPage();
    await tokensPage.title.waitForDisplayed({ timeout: 10_000 });
  };

  assertSeeTitleWithCounter = async () => {
    const tokensPage = new TokensPage();
    await tokensPage.title.waitForDisplayed();
    await tokensPage.counter.waitForDisplayed();
    await expect(await tokensPage.title.getText()).to.equal(await t('browserView.assets.title'));
    await expect(await tokensPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertCounterNumberMatchesWalletTokens = async () => {
    const tokensPage = new TokensPage();
    const tokensCounterValue = Number((await tokensPage.counter.getText()).slice(1, -1));
    if (tokensCounterValue > 0) await tokensPage.coinGeckoCredits.scrollIntoView();
    await browser.pause(1000);
    const rowsNumber = (await tokensPage.getRows()).length;
    await expect(rowsNumber).to.equal(tokensCounterValue);
  };

  assertSeeTotalWalletBalance = async () => {
    const tokensPage = new TokensPage();
    await tokensPage.totalBalanceLabel.waitForDisplayed();
    await expect(await tokensPage.totalBalanceLabel.getText()).to.equal(
      await t('browserView.assets.totalWalletBalance')
    );
    await expect(await tokensPage.getTotalBalanceCurrency()).to.equal('USD');
    const actualTotalBalance = Number(((await tokensPage.getTotalBalanceValue()) as string).replace(/,/g, ''));
    await expect(actualTotalBalance).to.be.greaterThan(0);
  };

  assertSeeCurrencyLabelWithTimeout = async (maxWaitTime: number) => {
    const tokensPage = new TokensPage();
    await tokensPage.totalBalanceCurrencyElement.waitForDisplayed({ timeout: maxWaitTime });
  };

  assertSeeReceiveAndSendButtonsInHeader = async (shouldSee: boolean) => {
    await MenuHeader.sendButton.waitForDisplayed({ reverse: !shouldSee });
    await MenuHeader.receiveButton.waitForDisplayed({ reverse: !shouldSee });
  };

  assertSeeReceiveAndSendButtonsInPopupMode = async (shouldSee: boolean) => {
    const tokensPage = new TokensPage();
    await tokensPage.sendButtonPopupMode.waitForDisplayed({ reverse: !shouldSee });
    await tokensPage.receiveButtonPopupMode.waitForDisplayed({ reverse: !shouldSee });
  };

  assertSeeTableTitles = async () => {
    const tokensPage = new TokensPage();
    await webTester.seeWebElement(tokensPage.tokensTableTitle('Token'));
    await webTester.seeWebElement(tokensPage.tokensTableTitle('Price / 24hr %'));
    await webTester.seeWebElement(tokensPage.tokensTableTitle('Balance'));
  };

  assertSeeTableItems = async (mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();

    await browser.waitUntil(async () => (await tokensPage.getRows()).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all tokens'
    });

    const rowsNumber = (await tokensPage.getRows()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      await webTester.seeWebElement(tokensPage.tokensTableItemAvatar(i));
      await webTester.seeWebElement(tokensPage.tokensTableItemTitle(i));
      await webTester.seeWebElement(tokensPage.tokensTableItemSubTitle(i));
      await webTester.seeWebElement(tokensPage.tokensTableItemValue(i, mode));
      await webTester.seeWebElement(tokensPage.tokensTableItemValueFiat(i, mode));
    }
  };

  assertSeeCardanoItem = async (mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();
    await expect(await tokensPage.getTokensTableItemTitle(1)).to.equal(Asset.CARDANO.name);
    await expect(await tokensPage.getTokensTableItemSubTitle(1)).to.equal(Asset.CARDANO.ticker);

    const tokensValue = await tokensPage.getTokenTableItemValueByIndex(1, mode);
    await expect(tokensValue).to.be.greaterThan(0);

    const tokenValueFiat = ((await tokensPage.getTokenTableItemValueFiatByIndex(1, mode)) as string).replace(',', '');
    const tokenValueFiatFloat = Number.parseFloat(tokenValueFiat.split(' ')[0]);
    await expect(tokenValueFiatFloat).to.be.greaterThan(0);
  };

  assertSeeLaceCoinItem = async (mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();

    await expect(await tokensPage.getTokenNames()).to.contain(Asset.LACE_COIN.name);
    await expect(await tokensPage.getTokenTickers()).to.contain(Asset.LACE_COIN.ticker);

    const tokensTableIndex = await tokensPage.getTokenRowIndex(Asset.LACE_COIN.name);
    const tokenValue = await tokensPage.getTokenTableItemValueByIndex(tokensTableIndex, mode);
    await expect(tokenValue).to.be.greaterThan(0);

    const tokenValueFiat = (await tokensPage.getTokenTableItemValueFiatByIndex(tokensTableIndex, mode)) as string;
    await expect(tokenValueFiat).to.equal('-');
  };

  assertSeeHoskyItem = async (mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();

    await expect(await tokensPage.getTokenNames()).to.contain(Asset.HOSKY_TOKEN.name);
    await expect(await tokensPage.getTokenTickers()).to.contain(Asset.HOSKY_TOKEN.ticker);

    const tokensTableIndex = await tokensPage.getTokenRowIndex(Asset.HOSKY_TOKEN.name);
    const tokenValue = await tokensPage.getTokenTableItemValueByIndex(tokensTableIndex, mode);
    await expect(tokenValue).to.be.greaterThan(0);

    const tokenValueFiat = (await tokensPage.getTokenTableItemValueFiatByIndex(tokensTableIndex, mode)) as string;
    await expect(tokenValueFiat).to.equal('-');
  };

  assertSeeNativeToken = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    await this.assertSeeTokenItemBasicData(tokenName, mode);
    await this.assertSeeNativeTokenData(tokenName, mode);
  };

  assertSeeNotNativeToken = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    await this.assertSeeTokenItemBasicData(tokenName, mode);
    await this.assertSeeNotNativeTokenData(tokenName, mode);
  };

  assertSeeTokenItemBasicData = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();
    await expect(await tokensPage.getTokenNames()).to.contain(tokenName.name);
    await expect(await tokensPage.getTokenTickers()).to.contain(tokenName.ticker);
    const tokensTableIndex = await tokensPage.getTokenRowIndex(tokenName.name);
    const tokenValue = await tokensPage.getTokenTableItemValueByIndex(tokensTableIndex, mode);
    await expect(tokenValue).to.be.greaterThan(0);
  };

  assertSeeNativeTokenData = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();
    const tokensTableIndex = await tokensPage.getTokenRowIndex(tokenName.name);
    const tokenValueFiat = (await tokensPage.getTokenTableItemValueFiatByIndex(tokensTableIndex, mode)) as string;
    await expect(tokenValueFiat).to.match(new RegExp('^([\\d+,.])+\\.\\d{2}\\s\\D{2,3}$'));
    if (mode === 'extended') {
      const tokenValuePriceAda = (await tokensPage.getTokenTableItemValuePriceAdaByIndex(tokensTableIndex)) as string;
      await expect(tokenValuePriceAda).to.match(new RegExp('^\\d+\\.\\d+$'));
      const tokenValuePriceChange = (await tokensPage.getTokenTableItemValuePriceChangeByIndex(
        tokensTableIndex
      )) as string;
      await expect(tokenValuePriceChange).to.match(new RegExp('^([-+])\\d+\\.\\d{2}$'));
    }
  };

  assertSeeNotNativeTokenData = async (tokenName: Asset, mode: 'extended' | 'popup') => {
    const tokensPage = new TokensPage();
    const tokensTableIndex = await tokensPage.getTokenRowIndex(tokenName.name);
    const tokenValueFiat = (await tokensPage.getTokenTableItemValueFiatByIndex(tokensTableIndex, mode)) as string;
    await expect(tokenValueFiat).to.equal('-');
    if (mode === 'extended') {
      const tokenValuePriceAda = (await tokensPage.getTokenTableItemValuePriceAdaByIndex(tokensTableIndex)) as string;
      await expect(tokenValuePriceAda).to.equal('-');
      const tokenValuePriceChange = (await tokensPage.getTokenTableItemValuePriceChangeByIndex(
        tokensTableIndex
      )) as string;
      await expect(tokenValuePriceChange).to.equal('-');
    }
  };

  async assertSeeToken(shouldSee: boolean, tokenDetails: ExpectedTokenDetails, mode: 'extended' | 'popup') {
    const tokensPage = new TokensPage();
    if (shouldSee) {
      await tokensPage.tokensTableItemWithName(tokenDetails.name).waitForDisplayed({ timeout: 10_000 });
      await expect(await tokensPage.getTokenNames()).to.contain(tokenDetails.name);
      await expect(await tokensPage.getTokenTickers()).to.contain(tokenDetails.ticker);
      const tokensTableIndex = await tokensPage.getTokenRowIndex(tokenDetails.name);
      const tokenValue = await tokensPage.getTokenTableItemValueByIndex(tokensTableIndex, mode);
      await expect(tokenValue).to.equal(tokenDetails.value);
    } else {
      await expect(await tokensPage.getTokenNames()).to.not.contain(tokenDetails.name);
      await expect(await tokensPage.getTokenTickers()).to.not.contain(tokenDetails.ticker);
    }
  }

  async assertSeeValueSubtractedAda(
    tokenName: string,
    subtractedAmount: string,
    fee: string,
    mode: 'extended' | 'popup'
  ) {
    const tokensPage = new TokensPage();
    const expectedValue =
      Number.parseFloat(await testContext.load(`${Asset.getByName(tokenName).ticker}tokenBalance`)) -
      Number.parseFloat(subtractedAmount) -
      Number.parseFloat(fee);
    const expectedValueRounded = Number.parseFloat(expectedValue.toFixed(2));
    Logger.log(`waiting for token: ${tokenName} with value: ${expectedValueRounded}`);
    await browser.waitUntil(
      async () =>
        (await tokensPage.getTokenTableItemValueByName(tokenName, mode)) === expectedValueRounded + 0.01 ||
        (await tokensPage.getTokenTableItemValueByName(tokenName, mode)) === expectedValueRounded - 0.01 ||
        (await tokensPage.getTokenTableItemValueByName(tokenName, mode)) === expectedValueRounded,
      {
        timeout: 30_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for ${tokenName} value update`
      }
    );
  }

  async assertSeeValueSubtractedAsset(tokenName: string, subtractedAmount: string, mode: 'extended' | 'popup') {
    const tokensPage = new TokensPage();
    const expectedValue =
      Number.parseFloat(await testContext.load(`${Asset.getByName(tokenName).ticker}tokenBalance`)) -
      Number.parseFloat(subtractedAmount);
    const expectedValueRounded = Number.parseFloat(expectedValue.toFixed(2));
    Logger.log(`waiting for token: ${tokenName} with value: ${expectedValueRounded}`);
    await browser.waitUntil(
      async () => (await tokensPage.getTokenTableItemValueByName(tokenName, mode)) === expectedValueRounded,
      {
        timeout: 30_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for ${tokenName} value update`
      }
    );
  }

  async assertSeeCoinGeckoCredits(shouldSee: boolean) {
    const tokensPage = new TokensPage();
    await tokensPage.coinGeckoCredits.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      const expectedCredits = `${await t('general.credit.poweredBy')}\n${await t('general.credit.coinGecko')}`;
      await expect(await tokensPage.coinGeckoCredits.getText()).to.equal(expectedCredits);
      await expect(await tokensPage.coinGeckoLink.isEnabled()).to.be.true;
    }
  }

  async assertSeeCoinGeckoURL() {
    const COINGECKO_URL = 'https://www.coingecko.com';
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(COINGECKO_URL);
  }

  async seePriceFetchExpiredErrorMessage() {
    const tokensPage = new TokensPage();
    await tokensPage.getPriceFetchErrorDescription.waitForDisplayed({ timeout: 210_000 });
    const expiredErrorMessageToMatch = (await t('general.warnings.priceDataExpired')).split(':')[0];
    await expect(await tokensPage.getPriceFetchErrorDescription.getText()).to.include(expiredErrorMessageToMatch);
  }

  async seePriceFetchFailedErrorMessage() {
    const tokensPage = new TokensPage();
    const ADA_PRICE_CHECK_INTERVAL = 65_000;
    await tokensPage.getPriceFetchErrorDescription.waitForDisplayed({ timeout: ADA_PRICE_CHECK_INTERVAL });
    await expect(await tokensPage.getPriceFetchErrorDescription.getText()).to.equal(
      await t('general.warnings.cannotFetchPrice')
    );
  }

  async seePriceFetchExpiredErrorMessageInTokenDetailsScreen() {
    const expiredErrorMessageToMatch = (await t('general.warnings.priceDataExpired')).split('.')[0];
    await expect(await Banner.getContainerText()).to.include(expiredErrorMessageToMatch);
  }
}

export default new TokensPageAssert();
