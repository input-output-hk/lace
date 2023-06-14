/* eslint-disable no-undef */
import { When, Then } from '@cucumber/cucumber';
import menuMainAssert from '../assert/menuMainAssert';
import networkAssert from '../assert/networkAssert';
import MenuMainExtended from '../elements/menuMainExtended';
import MenuMainPopup from '../elements/menuMainPopup';
import { ChainablePromiseElement } from 'webdriverio';

When(/^I see main navigation with all items in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  await menuMainAssert.assertSeeMainMenu(mode);
});

Then(/^Each main navigation item contains icon and text$/, async () => {
  await menuMainAssert.assertSeeIconAndTextForEachMenuItemExtended();
});

Then(
  /clicking on "([^"]*)" in (popup|extended) mode, existence of matomo event with payload containing: "([^"]*)" should be: (true|false)/,
  async (element: string, mode: string, actionName: string, shouldBePresent: string) => {
    const actions = actionName.split(',');
    let elementToClick: ChainablePromiseElement<WebdriverIO.Element>;
    switch (element) {
      case 'Tokens': {
        elementToClick = mode === 'extended' ? MenuMainExtended.tokensButton : MenuMainPopup.tokensButton;
        break;
      }
      case 'NFTs': {
        elementToClick = mode === 'extended' ? MenuMainExtended.nftsButton : MenuMainPopup.nftsButton;
        break;
      }
      case 'Transactions': {
        elementToClick = mode === 'extended' ? MenuMainExtended.transactionsButton : MenuMainPopup.transactionsButton;
        break;
      }
      case 'Staking': {
        elementToClick = mode === 'extended' ? MenuMainExtended.stakingButton : MenuMainPopup.stakingButton;
        break;
      }
      default: {
        throw new Error(`Element ${element} not found`);
      }
    }

    await networkAssert.assertRequestWithParametersIsPresent(
      elementToClick,
      'matomo',
      actions,
      shouldBePresent === 'true'
    );
  }
);
