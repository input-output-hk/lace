/* eslint-disable no-magic-numbers */
/* eslint-disable new-cap */
import { Given, Then } from '@cucumber/cucumber';
import nftsPageObject from '../pageobject/nftsPageObject';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import nftAssert from '../assert/nftAssert';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import webTester from '../actor/webTester';

Then(
  /^NFT with name: "([^"]*)" (is displayed|is not displayed) in coin selector$/,
  async (nftName: string, state: string) => {
    await nftAssert.assertNftDisplayed(nftName, state === 'is displayed');
  }
);

Then(/^I see NFT details opened in drawer with title: "([^"]*)"$/, async (nftName: string) => {
  await drawerCommonExtendedAssert.assertSeeDrawerWithTitle(nftName);
  await nftAssert.assertSeeNftDetails();
});

Given(
  /^I am on a NFT details on the (extended|popup) view for NFT with name: "([^"]*)"$/,
  async (mode: string, nftName: string) => {
    await nftsPageObject.clickNftItem(nftName);
    if (mode === 'extended') await drawerCommonExtendedAssert.assertSeeDrawerWithTitle(nftName);

    await webTester.waitUntilSeeElementContainingText(nftName);
    await nftAssert.assertSeeNftDetails();
  }
);

Given(/^I'm sending an NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await nftsPageObject.progressWithSendUntilPasswordPage(nftName);
});

Given(/^the NFT is pre-loaded as token to be sent with name: "([^"]*)"$/, async (nftName: string) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTitle(nftName);
});

Given(/^the amount in token input "([\d+])"$/, async (expectedCount: number) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTokenInputValue(expectedCount);
});
