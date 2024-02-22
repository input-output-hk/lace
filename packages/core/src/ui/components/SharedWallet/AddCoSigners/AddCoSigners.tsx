import React, { useMemo } from 'react';
import { Box, Flex, Text, Button, ControlButton, SuggestionThreeItemType, ScrollArea, sx } from '@lace/ui';
import { Wallet } from '@lace/cardano';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, ValidateAddress } from './type';
import { addEllipsis } from '@lace/common';
import { useCoSigners } from './hooks';

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
    removeButton: string;
  };
}

const MAX_COSIGNERS = 20;
const HEAD_LENGTH = 10;
const TAIL_LENGTH = 5;

export const AddCoSigners = ({ addressBook, translations, validateAddress, onBack, onNext }: Props): JSX.Element => {
  const { coSigners, updateCoSigner, removeCoSigner, addCoSigner } = useCoSigners();

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

      <ScrollArea
        classNames={{
          root: styles.scrollArea,
          viewport: styles.scrollAreaViewport,
          bar: styles.scrollBar
        }}
      >
        {coSigners.map(({ id }, index) => (
          <Box key={id} className={styles.coSigners}>
            <AddCoSignerInput
              suggestions={suggestions}
              validateAddress={validateAddress}
              translations={{
                label: translations.inputLabel,
                error: translations.inputError
              }}
              onChange={(address, isValid) => {
                updateCoSigner(index, { address, isValid, id });
              }}
            />
            {index !== 0 && (
              <button
                tabIndex={0}
                className={styles.remove}
                onClick={() => {
                  removeCoSigner(index);
                }}
              >
                <Text.Body.Small weight="$semibold" className={styles.removeLabel}>
                  {translations.removeButton}
                </Text.Body.Small>
              </button>
            )}
          </Box>
        ))}
      </ScrollArea>

      {coSigners.length > 1 && (
        <Flex w="$fill" mb="$8" justifyContent="flex-end">
          <Text.Body.Small
            weight="$bold"
            className={sx({
              color: '$text_secondary'
            })}
          >
            {coSigners.length}/{MAX_COSIGNERS}
          </Text.Body.Small>
        </Flex>
      )}
      <Box w="$fill" mb="$40">
        <ControlButton.Outlined
          w="$fill"
          disabled={coSigners.length === MAX_COSIGNERS}
          label={translations.addButton}
          onClick={() => addCoSigner()}
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
