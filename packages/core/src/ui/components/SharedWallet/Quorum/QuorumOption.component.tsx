import React, { useState } from 'react';
import styles from './QuorumOption.module.scss';
import { Card, RadioButtonGroup, Flex, Button, Select, Text, Box } from '@lace/ui';

export interface QuorumOptionProps {
  translations: {
    title: string;
    description: string;
    cosignersSentence: Record<'start' | 'end', string>;
    navigationButtons: Record<'back' | 'next', string>;
  };
  radioButtonOptions: Record<'allAddresses' | 'anyAddress' | 'someAddress', string>;
  cosignerValue: { label: string; value: string }[];
  onNext: (data: { userSelection: string; numberOfCosigner: string }) => void;
  onBack: () => void;
}

export const QuorumOption = ({
  translations: { title, description, cosignersSentence, navigationButtons },
  radioButtonOptions: { allAddresses, anyAddress, someAddress },
  cosignerValue,
  onBack,
  onNext
}: QuorumOptionProps): JSX.Element => {
  const [radioButtonValue, setRadioButtonValue] = useState('');
  const [cosignerSelection, setCosignerSelection] = useState<string | undefined>();

  const onChange = (eventValue: string) => {
    setRadioButtonValue(eventValue);
  };

  const radioButtonValues = [
    {
      value: 'allAddresses',
      label: allAddresses
    },
    {
      value: 'anyAddress',
      label: anyAddress
    },
    {
      value: 'someAddress',
      label: someAddress
    }
  ];

  const onSelectValueChange = (selectEventValue: string) => {
    setCosignerSelection(selectEventValue);
  };

  return (
    <Flex h="$fill" flexDirection="column">
      <div className={styles.QuorumOption} data-testid="setup-quorum-container">
        <Text.Heading data-testid="setup-quorum-user-header">{title}</Text.Heading>
        <Box mb="$28" mt="$20">
          <Text.Body.Normal data-testid="setup-quorum-user-description">{description}</Text.Body.Normal>
        </Box>
        <Card.Outlined className={styles.cardContainer} data-testid="setup-quorum-user-options">
          <RadioButtonGroup options={radioButtonValues} onValueChange={onChange} selectedValue={radioButtonValue} />
        </Card.Outlined>

        <Flex
          w="$fill"
          pt="$24"
          pb="$64"
          justifyContent="flex-start"
          alignItems="center"
          data-testid="setup-quorum-cosigner-container"
        >
          <Select.Root
            variant="outline"
            placeholder="0"
            value={cosignerSelection}
            onChange={onSelectValueChange}
            showArrow
          >
            {cosignerValue.map(({ value, label }) => (
              <Select.Item key={value} value={value} title={label} />
            ))}
          </Select.Root>
          <Text.Body.Small className={styles.dropdownCopy}>
            {cosignersSentence.start} {cosignerValue.length} {cosignersSentence.end}
          </Text.Body.Small>
        </Flex>

        <Flex w="$fill" justifyContent="space-between" alignItems="center" data-testid="setup-quorum-navigation">
          <Button.Secondary label={navigationButtons.back} onClick={onBack} />
          <Button.CallToAction
            disabled={!radioButtonValue || !cosignerSelection}
            label={navigationButtons.next}
            onClick={() => onNext({ userSelection: radioButtonValue, numberOfCosigner: cosignerSelection })}
          />
        </Flex>
      </div>
    </Flex>
  );
};
