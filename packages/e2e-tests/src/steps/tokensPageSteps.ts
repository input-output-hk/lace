import { When, Then } from '@cucumber/cucumber';
import tokensPageAssert from '../assert/tokensPageAssert';
import walletAddressPageAssert from '../assert/walletAddressPageAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import tokensPageObject from '../pageobject/tokensPageObject';
import tokenDetailsAssert from '../assert/tokenDetailsAssert';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import settingsPageExtendedAssert from '../assert/settings/settingsPageExtendedAssert';
import { switchToLastWindow } from '../utils/window';
import extensionUtils from '../utils/utils';
import { TokensPage } from '../elements/tokensPage';
import walletAddressPage from '../elements/walletAddressPage';

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

Then(
  /^I see current network: "(Mainnet|Preprod|Preview)" name in network setting$/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await settingsPageExtendedAssert.assertSeeCurrentNetworkName(network);
  }
);

Then(
  /^I see current network: "(Mainnet|Preprod|Preview)" name in "About Lace" widget$/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await settingsPageExtendedAssert.assertSeeNetworkInAboutComponent(network);
  }
);

Then(
  /^I see "(Mainnet|Preprod|Preview)" specific tokens in (extended|popup) mode$/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview', mode: 'extended' | 'popup') => {
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

Then(/^I see "Wallet Address" page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await walletAddressPageAssert.assertSeeWalletAddressPage(mode);
  await walletAddressPageAssert.assertSeeWalletNameAndAddress(getTestWallet(TestWalletName.TestAutomationWallet));
});

When(/^I click "Copy" button on "Wallet Address" page$/, async () => {
  await walletAddressPage.copyButton.waitForClickable();
  await walletAddressPage.copyButton.click();
});

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

Then(
  /^I save token: "([^"]*)" balance in (extended|popup) mode$/,
  async (tokenName: string, mode: 'extended' | 'popup') => {
    await tokensPageObject.saveTokenBalance(tokenName, mode);
  }
);

Then(
  // eslint-disable-next-line max-len
  /^the sent amount of: "([^"]*)" with fee: "([^"]*)" for token "([^"]*)" is subtracted from the total balance in (extended|popup) mode$/,
  async (subtractedAmount: string, fee: string, tokenName: string, mode: 'extended' | 'popup') => {
    switch (fee) {
      case 'saved':
        fee = await testContext.load('feeValue');
        break;
      case 'feeValueDAppTx':
        fee = await testContext.load('feeValueDAppTx');
        break;
      default:
        break;
    }
    await tokensPageAssert.assertSeeValueSubtractedAda(tokenName, subtractedAmount, fee, mode);
  }
);

Then(
  /^the sent amount of: "([^"]*)" for token "([^"]*)" is subtracted from the total balance in (extended|popup) mode$/,
  async (subtractedAmount: string, tokenName: string, mode: 'extended' | 'popup') => {
    await tokensPageAssert.assertSeeValueSubtractedAsset(tokenName, subtractedAmount, mode);
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
  const tokensPage = new TokensPage();
  switch (button) {
    case 'Receive':
      await tokensPage.receiveButtonPopupMode.waitForDisplayed();
      await tokensPage.receiveButtonPopupMode.click();
      break;
    case 'Send':
      await tokensPage.sendButtonPopupMode.waitForDisplayed();
      await tokensPage.sendButtonPopupMode.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});
