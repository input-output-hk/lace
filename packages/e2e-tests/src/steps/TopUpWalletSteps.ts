import { Then, When } from '@cucumber/cucumber';
import TopUpWalletAssert from '../assert/TopUpWalletAssert';
import TopUpWalletCard from '../elements/TopUpWalletCard';
import TopUpWalletDialog from '../elements/TopUpWalletDialog';
import TopUpWalletSmallCard from '../elements/TopUpWalletSmallCard';

Then(/^Banxa's widget (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await TopUpWalletAssert.assertSeeBanxaWidget(shouldBeDisplayed === 'is');
});

When(/^I click on "Buy ADA" button on Banxa's widget$/, async () => {
  await TopUpWalletCard.clickBuyAdaButton();
});

When(/^I click on "Buy ADA" button on small Banxa's widget$/, async () => {
  await TopUpWalletSmallCard.clickBuyAdaButton();
});

Then(/^"You're leaving Lace for Banxa" dialog (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await TopUpWalletAssert.assertSeeTopUpWalletDialog(shouldBeDisplayed === 'is');
});

When(
  /^I click on "(Go Back|Continue)" button on "You're leaving Lace for Banxa" dialog$/,
  async (button: 'Go Back' | 'Continue') => {
    switch (button) {
      case 'Continue':
        await TopUpWalletDialog.clickContinueButton();
        break;
      case 'Go Back':
        await TopUpWalletDialog.clickGoBackButton();
        break;
      default:
        throw new Error(`Unsupported button: ${button}`);
    }
  }
);

Then(/^Banxa's transaction page is opened in a new tab$/, async () => {
  await TopUpWalletAssert.assertSeeBanxaTransactionPage();
});

Then(/^Banxa's small component (is|is not) displayed over tokens$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await TopUpWalletAssert.assertSeeSmallBanxaComponent(shouldBeDisplayed === 'is');
});

When(/^I click on "Banxa's website" link on Banxa's widget$/, async () => {
  await TopUpWalletDialog.disclaimerLinkCaption1.click();
});

Then(/^Banxa's website is displayed$/, async () => {
  await TopUpWalletAssert.assertSeeBanxaPage();
});
