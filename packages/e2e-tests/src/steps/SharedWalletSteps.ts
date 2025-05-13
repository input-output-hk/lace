import { Given, Then, When } from '@cucumber/cucumber';
import SharedWalletOnboardingAssert from '../assert/sharedWallet/AddSharedWalletMainModalAssert';
import AddSharedWalletMainModal from '../elements/sharedWallet/AddSharedWalletMainModal';
import GenerateSharedWalletKeyScreenAssert from '../assert/sharedWallet/GenerateSharedWalletKeyScreenAssert';
import GenerateSharedWalletKeyScreen from '../elements/sharedWallet/GenerateSharedWalletKeyScreen';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import CopySharedWalletKeyScreenAssert from '../assert/sharedWallet/CopySharedWalletKeyScreenAssert';
import CopySharedWalletKeyScreen from '../elements/sharedWallet/CopySharedWalletKeyScreen';
import CommonAssert from '../assert/commonAssert';
import testContext from '../utils/testContext';
import { generateSharedWalletKey } from '../utils/sharedWalletUtils';
import LetsFindYourSharedWalletScreenAssert from '../assert/sharedWallet/LetsFindYourSharedWalletScreenAssert';
import LetsFindYourSharedWalletScreen from '../elements/sharedWallet/LetsFindYourSharedWalletScreen';
import LetsCreateYourNewSharedWalletScreenAssert from '../assert/sharedWallet/LetsCreateYourNewSharedWalletScreenAssert';
import LetsCreateYourNewSharedWalletScreen from '../elements/sharedWallet/LetsCreateYourNewSharedWalletScreen';
import AddWalletCosignersScreenAssert from '../assert/sharedWallet/AddWalletCosignersScreenAssert';
import AddWalletCosignersScreen from '../elements/sharedWallet/AddWalletCosignersScreen';
import type { CosignersData } from '../types/sharedWallet';
import ImportantInformationAboutSharedWalletsModalAssert from '../assert/sharedWallet/ImportantInformationAboutSharedWalletsModalAssert';
import ImportantInformationAboutSharedWalletsModal from '../elements/sharedWallet/ImportantInformationAboutSharedWalletsModal';
import DefineWalletQuorumScreenAssert from '../assert/sharedWallet/DefineWalletQuorumScreenAssert';
import DefineWalletQuorumScreen from '../elements/sharedWallet/DefineWalletQuorumScreen';
import ShareWalletDetailsScreenAssert from '../assert/sharedWallet/ShareWalletDetailsScreenAssert';
import ShareWalletDetailsScreen from '../elements/sharedWallet/ShareWalletDetailsScreen';
import topNavigationAssert from '../assert/topNavigationAssert';

Given(/^I do not have previously generated shared wallet key$/, async () => {
  // empty step
});

Given(/^I have previously generated shared wallet key$/, async () => {
  await generateSharedWalletKey();
});

Then(/^I see shared wallets onboarding screen (after|before) generating key$/, async (state: 'after' | 'before') => {
  await SharedWalletOnboardingAssert.assertSeeOnboardingMainScreenInExtendedMode(state === 'after');
});

Then(/^"Generate wallet key" option is active$/, async () => {
  await SharedWalletOnboardingAssert.assertGenerateWalletKeyOptionIsActive();
});

Then(/^"Shared wallet key" option is active$/, async () => {
  await SharedWalletOnboardingAssert.assertCopySharedWalletOptionIsActive();
});

Then(/^"New Shared wallet" option (is|is not) active$/, async (state: 'is' | 'is not') => {
  await SharedWalletOnboardingAssert.assertCreateSharedWalletOptionStatus(state === 'is');
});

Then(/^"Import shared wallet" option (is|is not) active$/, async (state: 'is' | 'is not') => {
  await SharedWalletOnboardingAssert.assertImportSharedWalletOptionStatus(state === 'is');
});

When(
  /^I click on "(Generate|Create|Import|Copy to clipboard)" button on shared wallets onboarding screen$/,
  async (button: 'Generate' | 'Create' | 'Import' | 'Copy to clipboard') => {
    switch (button) {
      case 'Generate':
        await AddSharedWalletMainModal.clickOnGenerateButton();
        break;
      case 'Create':
        await AddSharedWalletMainModal.clickOnCreateButton();
        break;
      case 'Import':
        await AddSharedWalletMainModal.clickOnImportButton();
        break;
      case 'Copy to clipboard':
        await AddSharedWalletMainModal.clickOnCopyToClipboardButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);

Then(/^I see "Generate shared wallet key" screen$/, async () => {
  await GenerateSharedWalletKeyScreenAssert.assertSeeGenerateSharedWalletKeyScreen();
});

When(/^I enter valid password on "Generate shared wallet key" screen$/, async () => {
  const password = String(getTestWallet(TestWalletName.TestAutomationWallet).password);
  await GenerateSharedWalletKeyScreen.passwordInput.waitForClickable();
  await GenerateSharedWalletKeyScreen.passwordInput.setValue(password);
});

When(
  /^I click on "(Back|Generate key)" button on "Generate shared wallet key" screen$/,
  async (key: 'Back' | 'Generate key') => {
    switch (key) {
      case 'Generate key':
        await GenerateSharedWalletKeyScreen.clickOnGenerateKeyButton();
        break;
      case 'Back':
        await GenerateSharedWalletKeyScreen.clickOnBackButton();
        break;
      default:
        throw new Error(`Unknown button: ${key}`);
    }
  }
);

Then(/^I see "Copy shared wallet key" screen$/, async () => {
  const expectedKeyValue =
    'acct_shared_xvk1aavzsy74znzdmlfvju023tkpk6q0pjeh464rsuqzywg4vujpmlf5mft65523yqhavr6q0ld34pxxu7lrk9fauyq9vnn7fwvrfy86a5c95n3qp';
  await CopySharedWalletKeyScreenAssert.assertSeeCopySharedWalletKeyScreen(expectedKeyValue);
});

When(
  /^I click on "(Copy key to clipboard|Close)" button on "Copy shared wallet key" screen$/,
  async (button: 'Copy key to clipboard' | 'Close') => {
    switch (button) {
      case 'Copy key to clipboard':
        await CopySharedWalletKeyScreen.clickOnCopyToClipboardButton();
        break;
      case 'Close':
        await CopySharedWalletKeyScreen.clickOnCloseButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);

When(/^I save shared wallet key in test context$/, async () => {
  testContext.save('sharedWalletKey', String(await CopySharedWalletKeyScreen.sharedWalletKeysValue.getText()));
});

Then(/^shared wallet key is saved to clipboard$/, async () => {
  const expectedSharedWalletKey = String(testContext.load('sharedWalletKey'));
  await CommonAssert.assertClipboardContains(expectedSharedWalletKey);
});

Then(/^I see "Let's create your new shared wallet" screen$/, async () => {
  await LetsCreateYourNewSharedWalletScreenAssert.asserSeeLetsCreateYourNewSharedWalletScreen(
    TestWalletName.TestAutomationWallet,
    'Wallet 2'
  );
});

When(/^I enter "([^"]*)" as a new shared wallet name$/, async (name: string) => {
  await LetsCreateYourNewSharedWalletScreen.enterSharedWalletName(name);
});

When(
  /^I click on "(Back|Next)" button on "Let's create your new shared wallet" screen$/,
  async (button: 'Back' | 'Next') => {
    switch (button) {
      case 'Next':
        await LetsCreateYourNewSharedWalletScreen.clickOnNextButton();
        break;
      case 'Back':
        await LetsCreateYourNewSharedWalletScreen.clickOnBackButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);

Then(/^I see "Add wallet co-signers" screen$/, async () => {
  await AddWalletCosignersScreenAssert.assertSeeAddWalletCosignersScreen();
});

When(/^I enter valid identifier for myself, co-signer identifiers and shared keys$/, async () => {
  const cosignersData: CosignersData = {
    yourIdentifier: 'My ID',
    yourKey:
      'acct_shared_xvk1aavzsy74znzdmlfvju023tkpk6q0pjeh464rsuqzywg4vujpmlf5mft65523yqhavr6q0ld34pxxu7lrk9fauyq9vnn7fwvrfy86a5c95n3qp',
    cosigner1Identifier: 'Cosigner 1',
    cosigner1Key:
      'acct_shared_xvk1n5qmf8grawmu5wvuattk456fsm8lmtp4t2524jexgpnv8ens522f4fln7hfzpjjyr3ecj7zv32pnf5n86dus098j464cmvfsmf908ds865qg5',
    cosigner2Identifier: 'Cosigner 2',
    cosigner2Key:
      'acct_shared_xvk1lcshacml3qv96euzjjwwuh562k9uslr3kvhdkgapsd2gqwctlm0zsjadrek0vgfhqcmgpjvhn3zky5ptk7fcg3xr4u9sskqc2v6y8gsvrq7vp'
  };
  await AddWalletCosignersScreen.enterIdentifiersAndKeys(cosignersData);
});

When(/^I click on "(Back|Next)" button on "Add wallet co-signers" screen$/, async (button: 'Back' | 'Next') => {
  switch (button) {
    case 'Next':
      await AddWalletCosignersScreen.clickOnNextButton();
      break;
    case 'Back':
      await AddWalletCosignersScreen.clickOnBackButton();
      break;
    default:
      throw new Error(`Unknown button: ${button}`);
  }
});

Then(/^I see "Important information about shared wallets" modal$/, async () => {
  await ImportantInformationAboutSharedWalletsModalAssert.assertSeeModal();
});

When(/^I click on checkbox on "Important information about shared wallets" modal$/, async () => {
  await ImportantInformationAboutSharedWalletsModal.selectCheckbox();
});

When(
  /^I click on "(Back|Continue)" on "Important information about shared wallets" modal$/,
  async (button: 'Back' | 'Continue') => {
    switch (button) {
      case 'Back':
        await ImportantInformationAboutSharedWalletsModal.clickOnBackButton();
        break;
      case 'Continue':
        await ImportantInformationAboutSharedWalletsModal.clickOnContinueButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);

Then(/^I see "Define wallet quorum" screen$/, async () => {
  await DefineWalletQuorumScreenAssert.assertSeeScreen();
});

When(
  /^I choose "(All addresses must sign|Some addresses must sign)" option$/,
  async (option: 'All addresses must sign' | 'Some addresses must sign') => {
    await DefineWalletQuorumScreen.selectOption(option);
  }
);

When(/^I click on "(Back|Next)" button on "Define wallet quorum" screen$/, async (button: 'Back' | 'Next') => {
  switch (button) {
    case 'Back':
      await DefineWalletQuorumScreen.clickOnBackButton();
      break;
    case 'Next':
      await DefineWalletQuorumScreen.clickOnNextButton();
      break;
    default:
      throw new Error(`Unknown button: ${button}`);
  }
});

When(/^I open cosigners selection dropdown$/, async () => {
  await DefineWalletQuorumScreen.openCosignersSelectionDropdown();
});

When(/^I select (\d) cosigners$/, async (numberOfCosigners: number) => {
  await DefineWalletQuorumScreen.selectNumberOfCosigners(Number(numberOfCosigners));
});

Then(/^I see "Share wallet details" screen$/, async () => {
  await ShareWalletDetailsScreenAssert.assertSeeScreen();
});

When(
  /^I click on "(Download|Open shared wallet)" button on "Share wallet details" screen$/,
  async (button: 'Download' | 'Open shared wallet') => {
    switch (button) {
      case 'Download':
        await ShareWalletDetailsScreen.clickOnDownloadButton();
        break;
      case 'Open shared wallet':
        await ShareWalletDetailsScreen.clickOnOpenSharedWalletButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);

Then(/^shared wallet "([^"]*)" was loaded$/, async (walletName) => {
  await topNavigationAssert.assertSeeCoSignButton();
  await topNavigationAssert.assertSeeWalletNameOnMenuButton(walletName);
  await topNavigationAssert.assertSeeAccountNameOnMenuButton('Shared Wal...');
});

Then(/^I see "Let's find your shared wallet" screen$/, async () => {
  await LetsFindYourSharedWalletScreenAssert.assertSeeCopySharedWalletKeyScreen();
});

When(/^I upload (a valid|an invalid) JSON file with shared wallet$/, async (state: 'a valid' | 'an invalid') => {
  await LetsFindYourSharedWalletScreen.uploadSharedWalletJSON(state === 'a valid');
});

When(
  /^I click on "(Back|Open wallet)" button on "Let's find your shared wallet" screen$/,
  async (button: 'Back' | 'Open wallet') => {
    switch (button) {
      case 'Back':
        await LetsFindYourSharedWalletScreen.clickOnBackButton();
        break;
      case 'Open wallet':
        await LetsFindYourSharedWalletScreen.clickOnOpenWalletButton();
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }
);
