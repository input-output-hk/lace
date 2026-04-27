import { AccountId } from '@lace-contract/wallet-repo';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../../design-tokens';
import { Column, CustomTag, Divider, Icon } from '../../../../atoms';
import { DropdownMenu } from '../../../../molecules';

import type { SendSheetProps } from '../sendSheet';

interface AccountSelectorProps {
  copies: Pick<
    SendSheetProps['copies'],
    'accountDropdownTitle' | 'accountText' | 'sourceAccountLabel'
  >;
  values: Pick<SendSheetProps['values'], 'accounts' | 'selectedAccountId'>;
  actions: Pick<SendSheetProps['actions'], 'onSelectAccount'>;
  testIdPrefix?: string;
}

export const AccountSelector = ({
  copies,
  values,
  actions,
  testIdPrefix,
}: AccountSelectorProps) => {
  const { sourceAccountLabel, accountDropdownTitle, accountText } = copies;
  const { accounts, selectedAccountId } = values;
  const { onSelectAccount } = actions;

  const dropdownItems = useMemo(() => {
    return accounts.map(account => ({
      id: account.accountId,
      text: account.accountName,
      leftIcon: account.leftIcon,
      data: account.accountId,
    }));
  }, [accounts]);

  const selectedItem = useMemo(() => {
    return selectedAccountId
      ? dropdownItems.find(item => item.id === selectedAccountId)
      : null;
  }, [dropdownItems, selectedAccountId]);

  const handleSelectAccount = useCallback(
    (index: number) => {
      const accountId = accounts[index]?.accountId;
      if (accountId) {
        onSelectAccount(AccountId(accountId));
      }
    },
    [accounts, onSelectAccount],
  );

  const styles = getStyles();

  return (
    <Column gap={spacing.M}>
      <View style={styles.centerContainer}>
        <CustomTag
          size="S"
          backgroundType="semiTransparent"
          label={sourceAccountLabel}
          icon={<Icon name="ShareVertical" size={16} />}
          color="white"
          testID={`${testIdPrefix}-account-selector`}
        />
      </View>

      <DropdownMenu
        items={dropdownItems}
        title={selectedItem ? selectedItem.text : accountDropdownTitle}
        onSelectItem={handleSelectAccount}
        actionText={`${dropdownItems.length} ${accountText}`}
        selectedItemId={selectedItem?.id}
        testID={`${testIdPrefix}-account-selector-dropdown-menu`}
      />
      <Divider />
    </Column>
  );
};

const getStyles = () =>
  StyleSheet.create({
    centerContainer: {
      alignSelf: 'center',
    },
  });
