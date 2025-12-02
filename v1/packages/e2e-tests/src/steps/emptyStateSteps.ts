import { Then, When } from '@cucumber/cucumber';
import emptyStateAssert from '../assert/emptyStateAssert';
import coinConfigureAssert from '../assert/coinConfigureAssert';
import FundWalletBanner from '../elements/fundWalletBanner';
import { getTestWallet } from '../support/walletConfiguration';

Then(
  /^I see empty state banner for (Tokens|NFTs|Transactions|Staking) page in (extended|popup) mode$/,
  async (targetPage: string, mode: 'extended' | 'popup') => {
    switch (targetPage) {
      case 'Tokens':
        await emptyStateAssert.assertSeeEmptyStateTokens();
        break;
      case 'NFTs':
        await emptyStateAssert.assertSeeEmptyStateNFTs(mode);
        break;
      case 'Transactions':
        mode === 'extended'
          ? await emptyStateAssert.assertSeeEmptyStateTransactions()
          : await emptyStateAssert.assertSeeEmptyStateTransactionsPopup();
        break;
      case 'Staking':
        await emptyStateAssert.assertSeeEmptyStateStaking();
        break;
    }
  }
);

Then(/^the "MAX" button (is|is not) displayed/, async (shouldSee: 'is' | 'is not') => {
  await coinConfigureAssert.assertSeeMaxButton(shouldSee === 'is');
});

When(/^I click "Copy" button on empty state banner$/, async () => {
  await FundWalletBanner.copyAddressButton.click();
});

Then(
  /^I see address for account: (\d+) and wallet "([^"]*)" on empty state banner$/,
  async (accountNumber: number, testWalletName: string) => {
    await emptyStateAssert.assertSeeEmptyStateAddressForAccount(getTestWallet(testWalletName), accountNumber);
  }
);
