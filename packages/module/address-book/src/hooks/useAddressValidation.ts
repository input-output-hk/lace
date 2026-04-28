import { useCallback } from 'react';

import { useLaceSelector, useLoadModules } from '../hooks';

import type { BlockchainName } from '@lace-lib/util-store';

type ValidationResult = {
  isValid: boolean;
  detectedBlockchain?: BlockchainName;
  error?: 'empty' | 'invalid';
};

export const useAddressValidation = () => {
  const validators = useLoadModules('addons.loadAddressBookAddressValidators');
  const networkType = useLaceSelector('network.selectNetworkType');
  const blockchainNetworks = useLaceSelector(
    'network.selectBlockchainNetworks',
  );
  const validateAddress = useCallback(
    (
      address: string,
      blockchainType: BlockchainName | 'auto-detect',
    ): ValidationResult => {
      if (!address.trim()) {
        return { isValid: false, error: 'empty' };
      }

      if (!validators || validators.length === 0) {
        return { isValid: false, error: 'invalid' };
      }

      if (blockchainType === 'auto-detect') {
        for (const validator of validators) {
          const network =
            blockchainNetworks[validator.blockchainName]?.[networkType];
          if (!network) continue;

          const result = validator.validateAddress({
            address,
            network,
          });

          if (result.isNone()) {
            return {
              isValid: true,
              detectedBlockchain: validator.blockchainName,
            };
          }
        }
        return { isValid: false, error: 'invalid' };
      } else {
        const validator = validators.find(
          v => v.blockchainName === blockchainType,
        );
        if (!validator) {
          return { isValid: false, error: 'invalid' };
        }

        const network =
          blockchainNetworks[validator.blockchainName]?.[networkType];
        if (!network) {
          return { isValid: false, error: 'invalid' };
        }
        const result = validator.validateAddress({
          address,
          network,
        });

        return result.isNone()
          ? { isValid: true }
          : { isValid: false, error: 'invalid' };
      }
    },
    [validators, networkType, blockchainNetworks],
  );

  return { validateAddress };
};
