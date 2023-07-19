import { Then, When } from '@cucumber/cucumber';
import { TokenSelectionPage } from '../elements/newTransaction/tokenSelectionPage';

When(
  /^I click "(Add to transaction|Cancel|Clear|Select multiple)" button on asset picker drawer$/,
  async (button: 'Add to transaction' | 'Cancel' | 'Clear' | 'Select multiple') => {
    const tokenSelectionPage = new TokenSelectionPage();
    switch (button) {
      case 'Add to transaction':
        await tokenSelectionPage.addToTransactionButton.click();
        break;
      case 'Cancel':
        await tokenSelectionPage.cancelButton.click();
        break;
      case 'Clear':
        await tokenSelectionPage.clearButton.click();
        break;
      case 'Select multiple':
        await tokenSelectionPage.selectMultipleButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(
  /^I (see|do not see) "(Add to transaction|Cancel|Clear|Select multiple)" button on asset picker drawer$/,
  async (shouldSee: 'see' | 'do not see', button: 'Add to transaction' | 'Cancel' | 'Clear' | 'Select multiple') => {
    const tokenSelectionPage = new TokenSelectionPage();
    switch (button) {
      case 'Add to transaction':
        await tokenSelectionPage.addToTransactionButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Cancel':
        await tokenSelectionPage.cancelButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Clear':
        await tokenSelectionPage.clearButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Select multiple':
        await tokenSelectionPage.selectMultipleButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);
