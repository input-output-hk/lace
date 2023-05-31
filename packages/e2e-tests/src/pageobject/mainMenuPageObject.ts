import MenuMainPopup from '../elements/menuMainPopup';
import MenuMainExtended from '../elements/menuMainExtended';
import menuHeaderPageObject from './menuHeaderPageObject';

class MainMenuPageObject {
  tokens = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.tokensButton.click() : await MenuMainPopup.tokensButton.click();
  nfts = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.nftsButton.click() : await MenuMainPopup.nftsButton.click();
  transactions = async (mode: 'extended' | 'popup') =>
    mode === 'extended'
      ? await MenuMainExtended.transactionsButton.click()
      : await MenuMainPopup.transactionsButton.click();
  staking = async (mode: 'extended' | 'popup') =>
    mode === 'extended' ? await MenuMainExtended.stakingButton.click() : await MenuMainPopup.stakingButton.click();

  async navigateToSection(targetPage: string, mode: 'extended' | 'popup') {
    switch (targetPage) {
      case 'Tokens':
        await this.tokens(mode);
        break;
      case 'NFTs':
        await this.nfts(mode);
        break;
      case 'Transactions':
        await this.transactions(mode);
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
