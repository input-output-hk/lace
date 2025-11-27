/* eslint-disable no-lonely-if */
/* eslint-disable sonarjs/no-duplicate-string */
import { walletRoutePaths } from '@routes/wallet-paths';
import { useEffect } from 'react';

export const buttonIds = {
  sendNextBtnId: 'send-next-btn',
  nftDetailsBtnId: 'send-nft-btn',
  tokenBtnId: 'send-token-btn',
  addressSaveBtn: 'addr-save-btn'
};

const isElementEnabled = (element: Element): boolean => !element.hasAttribute('disabled');

// generic function, there are some sections that needs an specific handler for enter key event
const handleClick = (elementId: string) => {
  const element: HTMLButtonElement = document.querySelector(`#${elementId}`);

  if (element && !element.hasAttribute('disabled')) {
    element.click();
  }
};

const handleStakingBtn = () => {
  const stakeBtn: HTMLButtonElement = document.querySelector('[data-testid="stake-pool-details-stake-btn"]');
  const confirmStakeBtn: HTMLButtonElement = document.querySelector('[data-testid="stake-pool-confirmation-btn"]');
  const switchConfirmation: HTMLButtonElement = document.querySelector('[data-testid="switch-pools-modal-confirm"]');
  const stakeSignBtn: HTMLButtonElement = document.querySelector('[data-testid="stake-sign-confirmation-btn"]');
  const warningModalBtn: HTMLButtonElement = document.querySelector('[data-testid="exit-staking-modal-confirm"]');

  if (warningModalBtn) {
    warningModalBtn.click();
  } else if (confirmStakeBtn && !confirmStakeBtn.hasAttribute('disabled')) {
    confirmStakeBtn.click();
  } else if (stakeSignBtn && !stakeSignBtn.hasAttribute('disabled')) {
    stakeSignBtn.click();
  } else if (switchConfirmation && !switchConfirmation.hasAttribute('disabled')) {
    switchConfirmation.click();
  } else if (stakeBtn && !stakeBtn.hasAttribute('disabled')) {
    stakeBtn.click();
  }
};

const handleAddressBtn = () => {
  const addressEditBtn: HTMLButtonElement = document.querySelector('[data-testid="address-form-details-btn-edit"]');
  const addressSaveBtn: HTMLButtonElement = document.querySelector('[data-testid="address-form-button-save"]');
  const addressDeleteBtn: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-confirm"]');
  const isAddressDeleteButtonVisible = addressDeleteBtn?.offsetHeight;

  if (isAddressDeleteButtonVisible && isElementEnabled(addressDeleteBtn)) {
    addressDeleteBtn.click();
  } else if (addressSaveBtn && isElementEnabled(addressSaveBtn)) {
    addressSaveBtn.click();
  } else if (addressEditBtn && isElementEnabled(addressEditBtn)) {
    addressEditBtn.click();
  }
};

const handleSetting = () => {
  const showPKBtn: HTMLButtonElement = document.querySelector('[data-testid="show-public-key-button"]');
  const showPassphraseBtn: HTMLButtonElement = document.querySelector('[data-testid="show-passphrase-button"]');
  const hidePassphraseBtn: HTMLButtonElement = document.querySelector('[data-testid="hide-passphrase-button"]');
  const cancelDeletWalletBtn: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-cancel"]');

  if (showPKBtn && !showPKBtn.hasAttribute('disabled')) {
    showPKBtn.click();
  } else if (showPassphraseBtn && !showPassphraseBtn.hasAttribute('disabled')) {
    showPassphraseBtn.click();
  } else if (hidePassphraseBtn && !hidePassphraseBtn.hasAttribute('disabled')) {
    hidePassphraseBtn.click();
  } else if (cancelDeletWalletBtn && !cancelDeletWalletBtn.hasAttribute('disabled')) {
    cancelDeletWalletBtn.click();
  }
};

const handleAssetBtn = () => {
  const assetBtn: HTMLButtonElement = document.querySelector(`#${buttonIds.tokenBtnId}`);
  const sendBtn: HTMLButtonElement = document.querySelector(`#${buttonIds.sendNextBtnId}`);
  const agreeBtn: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-confirm"]');

  if (agreeBtn) {
    agreeBtn.click();
  } else if (assetBtn && !assetBtn.hasAttribute('disabled')) {
    assetBtn.click();
  } else if (sendBtn && !sendBtn.hasAttribute('disabled')) {
    sendBtn.click();
  }
};

const handleSendBtn = () => {
  const agreeBtn: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-confirm"]');

  if (agreeBtn) {
    agreeBtn.click();
  } else {
    handleClick(buttonIds.sendNextBtnId);
  }
};

const handleEnterKeyPress = (event: KeyboardEvent) => {
  const hash = window.location.hash;
  if (event.code === 'Enter') {
    switch (true) {
      case new RegExp('send').test(hash):
        handleSendBtn();
        break;
      case new RegExp('nft').test(hash):
        handleClick(buttonIds.nftDetailsBtnId);
        break;
      case new RegExp(walletRoutePaths.assets).test(hash):
        handleAssetBtn();
        break;
      case new RegExp(walletRoutePaths.earn).test(hash) || new RegExp(walletRoutePaths.staking).test(hash):
        handleStakingBtn();
        break;
      case new RegExp(walletRoutePaths.addressBook).test(hash):
        handleAddressBtn();
        break;
      case new RegExp(walletRoutePaths.settings).test(hash):
        handleSetting();
        break;
      default:
        break;
    }
  }
};

export const useEnterKeyPress = (): void => {
  useEffect(() => {
    document.addEventListener('keydown', handleEnterKeyPress);
    return () => {
      document.removeEventListener('keydown', handleEnterKeyPress);
    };
  }, []);
};
