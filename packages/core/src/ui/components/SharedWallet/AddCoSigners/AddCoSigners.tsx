/* eslint-disable arrow-body-style */
import React, { useMemo, useState } from 'react';
import { Box, Flex, Text, Button, ControlButton, SuggestionThreeItemType } from '@lace/ui';
import { ReactComponent as GridIcon } from '@lace/icons/dist/GridComponent';
import { Wallet } from '@lace/cardano';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, ValidateAddress } from './type';
import { addEllipsis } from '@lace/common';

interface Props {
  onBack: () => void;
  onNext: (coSigner: CoSigner[]) => void;
  validateAddress: ValidateAddress;
  addressBook: {
    name: string;
    address: string | Wallet.Cardano.PaymentAddress;
    handleResolution?: Wallet.HandleResolution;
  }[];
  translations: {
    title: string;
    subtitle: string;
    inputLabel: string;
    inputError: string;
    addButton: string;
    backButton: string;
    nextButton: string;
  };
}

const MAX_COSIGNERS = 20;
const HEAD_LENGTH = 10;
const TAIL_LENGTH = 5;

export const AddCoSigners = ({ addressBook, translations, validateAddress, onBack, onNext }: Props): JSX.Element => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>([{ address: '', isValid: false }]);
  const suggestions: SuggestionThreeItemType[] = useMemo(
    () =>
      addressBook.map((addressEntry) => ({
        description: addEllipsis(addressEntry.address, HEAD_LENGTH, TAIL_LENGTH),
        title: addressEntry.name,
        value: addressEntry.handleResolution
          ? addressEntry.handleResolution.cardanoAddress.toString()
          : addressEntry.address
      })),
    [addressBook]
  );

  return (
    <Flex h="$fill" w="$fill" flexDirection="column">
      <Box mb="$24">
        <Text.Heading>{translations.title}</Text.Heading>
      </Box>
      <Box mb="$64">
        <Text.Body.Normal weight="$medium">{translations.subtitle}</Text.Body.Normal>
      </Box>

      <Box mb="$8" w="$fill">
        {coSigners.map((_, index) => (
          <Box key={index} className={styles.coSigners}>
            <AddCoSignerInput
              suggestions={suggestions}
              validateAddress={validateAddress}
              translations={{
                label: translations.inputLabel,
                error: translations.inputError
              }}
              onChange={(value) => {
                coSigners[index] = value;
                setCoSigners([...coSigners]);
              }}
            />
          </Box>
        ))}
      </Box>
      <Box mb="$8">
        <Text.Body.Small weight="$bold">
          {coSigners.length}/{MAX_COSIGNERS}
        </Text.Body.Small>
      </Box>
      <Box mb="$148" w="$fill">
        <ControlButton.Outlined
          w="$fill"
          disabled={coSigners.length === MAX_COSIGNERS}
          label={translations.addButton}
          icon={<GridIcon />}
          onClick={() => {
            setCoSigners([...coSigners, { address: '', isValid: false }]);
          }}
        />
      </Box>

      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={onBack} />
        <Button.CallToAction
          disabled={coSigners.some(({ isValid }) => !isValid)}
          label={translations.nextButton}
          onClick={() => onNext(coSigners)}
        />
      </Flex>
    </Flex>
  );
};
