import type { IconName } from '../../../atoms/icons/Icon';

export type ContactSheetMode = 'add' | 'edit';

/**
 * Blockchain type for contact addresses.
 * 'auto-detect' is the default option provided by the template.
 * Additional blockchain types can be provided via blockchainOptions prop.
 */
export type ContactBlockchainType = string;

export interface BlockchainOption {
  id: string;
  type: string;
  text: string;
  leftIcon: IconName;
}

export interface Recipient {
  id: string;
  blockchainType: ContactBlockchainType;
  blockchain: string;
  blockchainIcon: IconName;
  address: string;
  error?: string;
}

export interface ContactSheetProps {
  mode: ContactSheetMode;
  name: string;
  onNameChange: (name: string) => void;
  recipients: Recipient[];
  onAddRecipient: () => void;
  onRemoveRecipient: (id: string) => void;
  onBlockchainChange: (
    id: string,
    blockchainType: ContactBlockchainType,
  ) => void;
  onAddressChange: (
    id: string,
    address: string,
    blockchainType?: ContactBlockchainType,
  ) => void;
  onAddressBlur?: (id: string) => void;
  blockchainOptions: BlockchainOption[];
  avatarFallback: string;
  avatarUrl?: string;
  isResolvingAlias?: boolean;
  onUploadAvatar?: () => void;
  onRemoveAvatar?: () => void;
  onRemoveContact?: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  nameError?: string;
  testID?: string;
}
