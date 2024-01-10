/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import React, { useState } from 'react';
import styles from './SharedWalletQuorumOption.module.scss';
import { Card, RadioButton, Flex, Button, SelectGroup, Text, Box } from '@lace/ui';
import classNames from 'classnames';

export interface WalletSetupQuorumOptionProps {
  options: Record<'allAddresses' | 'anyAddress' | 'someAddress', string>;
  cosignersSentence: Record<'start' | 'end', string>;
  title: string;
  description: string;
  optionCoSigners: string;
  backButton: string;
  nextButton: string;

  onClick?: () => void;
  onNext: () => void;
  onBack: () => void;
}

const items = [
  {
    label: '1',
    value: '1'
  },
  {
    label: '2',
    value: '2'
  },
  {
    label: '3',
    value: '3'
  },
  {
    label: '4',
    value: '4'
  }
];

export const SharedWalletQuorumOption = ({
  options: { allAddresses, anyAddress, someAddress },
  title,
  description,
  cosignersSentence,
  backButton,
  nextButton,
  onBack,
  onNext
}: WalletSetupQuorumOptionProps) => {
  const [value, setValue] = useState('');
  const [selectedValue, setOnSelectValueChange] = useState<string | undefined>();

  const onChange = (eventValue: string) => {
    setValue(eventValue);
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
    setOnSelectValueChange(selectEventValue);
  };

  return (
    <div className={styles.sharedWalletQuorumOption}>
      <Text.Heading>{title}</Text.Heading>
      <Box mb="$28" mt="$20">
        <Text.Body.Normal>{description}</Text.Body.Normal>
      </Box>
      <Card.Outlined className={classNames(styles.root, styles.cardContainer)}>
        <RadioButton options={radioButtonValues} onValueChange={onChange} selectedValue={value} />
      </Card.Outlined>

      <div className={styles.dropdownContent}>
        <SelectGroup
          options={items}
          placeholder="0"
          selectedValue={selectedValue}
          onValueChange={onSelectValueChange}
        />
        <Text.Body.Small className={styles.dropdownCopy}>
          {cosignersSentence.start} {items.length} {cosignersSentence.end}
        </Text.Body.Small>
      </div>

      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={backButton} onClick={onBack} />
        <Button.CallToAction disabled={!value || !selectedValue} label={nextButton} onClick={onNext} />
      </Flex>
    </div>
  );
};
