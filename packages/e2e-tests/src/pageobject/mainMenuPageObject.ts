import MenuMainPopup from '../elements/menuMainPopup';
import MenuMainExtended from '../elements/menuMainExtended';
import menuHeaderPageObject from './menuHeaderPageObject';

class MainMenuPageObject {
  tokens = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.clickOnTokensButton() : await MenuMainPopup.clickOnTokensButton();
  nfts = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.clickOnNFTsButton() : await MenuMainPopup.clickOnNFTsButton();
  activity = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.clickOnActivityButton() : await MenuMainPopup.clickOnActivityButton();
  staking = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.clickOnStakingButton() : await MenuMainPopup.clickOnStakingButton();

  async navigateToSection(targetPage: string, mode: 'extended' | 'popup') {
    switch (targetPage) {
      case 'Tokens':
        await this.tokens(mode);
        break;
      case 'NFTs':
        await this.nfts(mode);
        break;
      case 'Transactions':
        await this.activity(mode);
        break;
      case 'Staking':
        await this.staking(mode);
        break;
      case 'Address Book':
        await menuHeaderPageObject.openAddressBook();
        break;
      case 'Settings':
        await menuHeaderPageObject.openSettings();
        break;
    }
  }
}

export default new MainMenuPageObject();
