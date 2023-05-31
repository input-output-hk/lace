import { Given, Then } from '@wdio/cucumber-framework';
import menuMainPopupPageAssert from '../assert/menuMainAssert';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';

Then(/^The bottom menu contains NFT item$/, async () => {
  await menuMainPopupPageAssert.assertSeeNftsButton('popup');
});

Given(/^I click NFTs button in bottom menu$/, async () => {
  await mainMenuPageObject.navigateToSection('NFTs', 'popup');
});
