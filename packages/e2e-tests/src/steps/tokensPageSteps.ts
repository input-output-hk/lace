import { Then, When } from '@cucumber/cucumber';
import tokensPageAssert from '../assert/tokensPageAssert';
import tokensPageObject from '../pageobject/tokensPageObject';
import tokenDetailsAssert from '../assert/tokenDetailsAssert';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import settingsPageExtendedAssert from '../assert/settings/SettingsPageAssert';
import { switchToLastWindow } from '../utils/window';
import extensionUtils from '../utils/utils';
import TokensPage from '../elements/tokensPage';
import type { NetworkType } from '../types/network';

When(/^I see Tokens counter with total number of tokens displayed$/, async () => {
  await tokensPageAssert.assertSeeTitleWithCounter();
});

Then(/^Tokens counter matches the number of wallet tokens$/, async () => {
  await tokensPageAssert.assertCounterNumberMatchesWalletTokens();
});

Then(/^I see total wallet balance in USD$/, async () => {
  await tokensPageAssert.assertSeeTotalWalletBalance();
});

Then(/^I (see|don't see) Receive & Send buttons in header$/, async (shouldSee: string) => {
  await tokensPageAssert.assertSeeReceiveAndSendButtonsInHeader(shouldSee === 'see');
});

Then(/^I (see|don't see) Receive & Send buttons on Tokens page in popup mode$/, async (shouldSee: string) => {
  await tokensPageAssert.assertSeeReceiveAndSendButtonsInPopupMode(shouldSee === 'see');
});

Then(
  /^I see Cardano & LaceCoin tokens on the list with all the details in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await tokensPageAssert.assertSeeTableItems(mode);
    await tokensPageAssert.assertSeeCardanoItem(mode);
    await tokensPageAssert.assertSeeLaceCoinItem(mode);
  }
);

Then(
  /^I see Cardano & Hosky tokens on the list with all the details in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await tokensPageAssert.assertSeeTableItems(mode);
    await tokensPageAssert.assertSeeCardanoItem(mode);
    await tokensPageAssert.assertSeeHoskyItem(mode);
  }
);

Then(/^I see current network: "(Mainnet|Preprod|Preview)" name in network setting$/, async (network: NetworkType) => {
  await settingsPageExtendedAssert.assertSeeCurrentNetworkName(network);
});

Then(
  /^I see current network: "(Mainnet|Preprod|Preview)" name in "About Lace" widget$/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await settingsPageExtendedAssert.assertSeeNetworkInAboutComponent(network);
  }
);

Then(
  /^I see "(Mainnet|Preprod|Preview)" specific tokens in (extended|popup) mode$/,
  async (network: NetworkType, mode: 'extended' | 'popup') => {
    const tHosky = {
      name: Asset.THOSKY.name,
      ticker: Asset.THOSKY.ticker,
      value: 100
    };

    const happyCoin = {
      name: Asset.HAPPY_COIN.name,
      ticker: Asset.HAPPY_COIN.ticker,
      value: 0.0001
    };

    const sundae = {
      name: Asset.SUNDAE.name,
      ticker: Asset.SUNDAE.ticker,
      value: 1
    };

    const hoskyToken = {
      name: Asset.HOSKY_TOKEN.name,
      ticker: Asset.HOSKY_TOKEN.ticker,
      value: 100
    };

    switch (network) {
      case 'Mainnet':
        await tokensPageAssert.assertSeeToken(true, hoskyToken, mode);
        await tokensPageAssert.assertSeeToken(true, sundae, mode);
        await tokensPageAssert.assertSeeToken(false, tHosky, mode);
        await tokensPageAssert.assertSeeToken(false, happyCoin, mode);
        break;
      case 'Preprod':
        await tokensPageAssert.assertSeeToken(true, tHosky, mode);
        await tokensPageAssert.assertSeeToken(false, happyCoin, mode);
        break;
      case 'Preview':
        await tokensPageAssert.assertSeeToken(true, happyCoin, mode);
        await tokensPageAssert.assertSeeToken(false, tHosky, mode);
        break;
      default:
        throw new Error(`Unrecognised network type: ${network}`);
    }
  }
);

When(/^I click token with name: "([^"]*)"$/, async (tokenName: string) => {
  await tokensPageObject.clickTokenWithName(tokenName);
});

Then(
  /^The Token details screen is displayed for token "([^"]*)" with ticker "([^"]*)" in (extended|popup) mode$/,
  async (tokenName: string, tokenTicker: string, mode: 'extended' | 'popup') => {
    tokenTicker = tokenTicker === 'tADA' && extensionUtils.isMainnet() ? 'ADA' : tokenTicker;
    await tokenDetailsAssert.assertSeeTokenDetailsPageForToken(tokenName, tokenTicker, mode);
  }
);

Then(/^I save token: "([^"]*)" balance$/, async (tokenName: string) => {
  await tokensPageObject.waitUntilCardanoTokenLoaded();
  await tokensPageObject.saveTokenBalance(tokenName);
});

Then(
  // eslint-disable-next-line max-len
  /^the sent amount of: "([^"]*)" with "(saved|DApp transaction)" fee for token "([^"]*)" is subtracted from the total balance$/,
  async (subtractedAmount: string, feeType: 'saved' | 'DApp transaction', tokenName: string) => {
    let fee: string;
    switch (feeType) {
      case 'saved':
        fee = await testContext.load('feeValue');
        break;
      case 'DApp transaction':
        fee = await testContext.load('feeValueDAppTx');
        break;
      default:
        throw new Error('Unsupported fee type');
    }
    await tokensPageAssert.assertSeeValueSubtractedAda(tokenName, subtractedAmount, fee);
  }
);

Then(
  /^the sent amount of: "([^"]*)" for token "([^"]*)" is subtracted from the total balance$/,
  async (subtractedAmount: string, tokenName: string) => {
    await tokensPageAssert.assertSeeValueSubtractedAsset(tokenName, subtractedAmount);
  }
);

Then(/^I (see|do not see) CoinGecko credits$/, async (shouldSee) => {
  await tokensPageAssert.assertSeeCoinGeckoCredits(shouldSee === 'see');
});

When(/^I click on "CoinGecko" link$/, async () => {
  await tokensPageObject.clickOnCoinGeckoCreditsLink();
});

Then(/^"www.coingecko.com" page is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await tokensPageAssert.assertSeeCoinGeckoURL();
});

When(/^I click "(Receive|Send)" button on Tokens page in popup mode$/, async (button: 'Receive' | 'Send') => {
  switch (button) {
    case 'Receive':
      await TokensPage.receiveButtonPopupMode.waitForDisplayed();
      await TokensPage.receiveButtonPopupMode.click();
      break;
    case 'Send':
      await TokensPage.sendButtonPopupMode.waitForDisplayed();
      await TokensPage.sendButtonPopupMode.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^Eye icon is not displayed on Tokens page$/, async () => {
  await tokensPageAssert.assertDoNotSeeEyeIcon();
});

Then(/^(closed|opened) eye icon is displayed on Tokens page$/, async (iconType: 'closed' | 'opened') => {
  iconType === 'closed'
    ? await tokensPageAssert.assertSeeClosedEyeIcon()
    : await tokensPageAssert.assertSeeOpenedEyeIcon();
});

When(/^I see (ADA|tADA) in the list of tokens$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await tokensPageAssert.assertSeeTicker(expectedTicker);
});

When(/^I click (closed|opened) eye icon on Tokens page$/, async (iconType: 'closed' | 'opened') => {
  iconType === 'closed' ? await TokensPage.closedEyeIcon.click() : await TokensPage.openedEyeIcon.click();
});

When(/^I click on "View all" button on token details drawer$/, async () => {
  await tokensPageObject.clickOnViewAllButton();
});

Then(/^total wallet balance is masked with asterisks$/, async () => {
  await tokensPageAssert.assertTotalWalletBalanceIsMasked();
});

Then(
  /^balance and FIAT balance for each token are (masked with asterisks|visible)$/,
  async (shouldBeMasked: 'masked with asterisks' | 'visible') => {
    await tokensPageAssert.assertAllBalancesAreMasked(shouldBeMasked === 'masked with asterisks');
  }
);
Then(/^I see total wallet balance in ADA is "([^"]*)"$/, async (balanceInAda: number) => {
  await tokensPageAssert.assertAdaBalance(balanceInAda);
});

Then(/^I see tMin token with the ADA balance of "([^"]*)"$/, async (balanceInAda: number) => {
  await tokensPageAssert.assertTMinBalance(balanceInAda);
});

Then(
  /^fiat prices expired fetch error is (displayed|not displayed)$/,
  async (shouldBeDisplayed: 'displayed' | 'not displayed') => {
    await tokensPageAssert.seePriceFetchExpiredErrorMessage(shouldBeDisplayed === 'displayed');
  }
);

Then(
  /^fiat prices unable to fetch error is (displayed|not displayed)$/,
  async (shouldBeDisplayed: 'displayed' | 'not displayed') => {
    await tokensPageAssert.seePriceFetchFailedErrorMessage(shouldBeDisplayed === 'displayed');
  }
);
