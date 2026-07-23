import type { ContactId } from './value-objects';
import type {
  AddressAliasResolution,
  AnyAddress,
} from '@lace-contract/addresses';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Option } from '@lace-lib/util';
import type { BlockchainAssigned } from '@lace-lib/util-store';

export type ContactAddress = Pick<AnyAddress, 'address' | 'blockchainName'> & {
  accountId?: AnyAddress['accountId'];
  network: BlockchainNetworkId;
};

export type Contact = {
  id: ContactId;
  name: string;
  avatar?: string;
  aliases: AddressAliasResolution[];
  addresses: ContactAddress[];
};

export type AddressBookAddressValidator = BlockchainAssigned<{
  validateAddress: (params: {
    address: string;
    network: BlockchainNetworkId;
  }) => Option<Error>;
}>;
