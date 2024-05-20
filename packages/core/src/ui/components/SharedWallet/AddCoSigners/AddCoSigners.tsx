import React from 'react';
import { Box, Flex, Text, Button, ControlButton, ScrollArea, sx } from '@lace/ui';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, ValidateAddress } from './type';
import { useCoSigners } from './hooks';
import { WarningBanner } from '@lace/common';

interface Props {
  onBack: () => void;
  onNext: (coSigner: CoSigner[]) => void;
  validateAddress: ValidateAddress;
  translations: {
    title: string;
    subtitle: string;
    inputLabel: string;
    inputError: string;
    addButton: string;
    backButton: string;
    nextButton: string;
    removeButton: string;
    warningMessage: string;
  };
}

const MAX_COSIGNERS = 2;

// this should be removed when extending this implementation beyond 2 cosigners
const SHOW_ADD_COSIGNER_BUTTON = false;

export const AddCoSigners = ({ translations, validateAddress, onBack, onNext }: Props): JSX.Element => {
  const { coSigners, updateCoSigner, removeCoSigner, addCoSigner } = useCoSigners();

  return (
    <Flex h="$fill" w="$fill" flexDirection="column">
      <Box mb="$24">
        <Text.Heading>{translations.title}</Text.Heading>
      </Box>
      <Box mb="$24">
        <Text.Body.Normal weight="$medium">{translations.subtitle}</Text.Body.Normal>
      </Box>

      <Box mb="$24">
        <WarningBanner message={translations.warningMessage} />
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
              validateAddress={validateAddress}
              translations={{
                label: translations.inputLabel,
                error: translations.inputError
              }}
              onChange={(address, isValid) => {
                updateCoSigner(index, { address, isValid, id });
              }}
            />
            {index !== 0 && SHOW_ADD_COSIGNER_BUTTON && (
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

      {coSigners.length > 1 && SHOW_ADD_COSIGNER_BUTTON && (
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
      {SHOW_ADD_COSIGNER_BUTTON && (
        <Box w="$fill" mb="$40">
          <ControlButton.Outlined
            w="$fill"
            disabled={coSigners.length === MAX_COSIGNERS}
            label={translations.addButton}
            onClick={() => addCoSigner()}
          />
        </Box>
      )}

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
