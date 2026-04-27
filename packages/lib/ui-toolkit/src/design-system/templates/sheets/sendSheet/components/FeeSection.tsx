import React from 'react';

import { spacing } from '../../../../../design-tokens';
import { Column, CustomTextInput, Divider } from '../../../../atoms';
import { DropdownMenu } from '../../../../molecules/dropdownMenu/dropdownMenu';

import type {
  FeeOption,
  FeeOptionTab,
} from '../../../../../utils/sendSheetUtils';

export interface FeeSectionProps {
  copies: { customFeeLabel: string };
  values: {
    customFeeRate?: string;
    feeOptions?: FeeOptionTab[];
    feeRateOption?: FeeOption;
  };
  actions: {
    onCustomFeeChange?: (value: string) => void;
    onFeeOptionChange: (option: FeeOption) => void;
  };
}

/**
 * Normalizes a user-entered decimal string for fee rate fields.
 *
 * Behavior:
 * - Removes all characters except digits and the decimal separator (`.`).
 * - Ensures at most one decimal point is present.
 *   - Subsequent dots are removed.
 * - Normalizes leading decimals:
 *   - `.5` → `0.5`
 * - If the user clears the field or no numeric content remains,
 *   returns `"0"` as the safe default value.
 *
 * @param input Raw string from a text input.
 * @returns A normalized decimal string (never empty; `"0"` for blank input).
 */
export const normalizeFeeRateInput = (input: string): string => {
  let numeric = input.replace(/[^0-9.]/g, '');

  if (!numeric) return '0';

  const parts = numeric.split('.');

  if (parts.length > 2) {
    numeric = parts[0] + '.' + parts.slice(1).join('');
  }

  if (numeric.startsWith('.')) numeric = '0' + numeric;

  const [intPartRaw, decPart] = numeric.split('.');

  let intPart = intPartRaw.replace(/^0+(?=\d)/, '');

  if (intPart === '') intPart = '0';

  if (decPart !== undefined) {
    return `${intPart}.${decPart}`;
  }

  return intPart;
};

export const FeeSection = ({ copies, values, actions }: FeeSectionProps) => {
  const { customFeeLabel } = copies;
  const { feeOptions, feeRateOption, customFeeRate } = values;
  const { onFeeOptionChange, onCustomFeeChange } = actions;

  const dropdownItems = (feeOptions || []).map(opt => {
    const item = typeof opt === 'string' ? { label: opt, value: opt } : opt;
    return { id: item.value, text: item.label };
  });

  const selectedItem = dropdownItems.find(
    item => item.id === feeRateOption || item.text === feeRateOption,
  );

  return (
    <Column gap={spacing.M}>
      <Divider />
      <DropdownMenu
        title={selectedItem?.text ?? ''}
        items={dropdownItems}
        selectedItemId={selectedItem?.id}
        onSelectItem={index => {
          const item = dropdownItems[index];
          if (item) onFeeOptionChange(item.id);
        }}
      />
      {feeRateOption === 'Custom' && (
        <CustomTextInput
          isWithinBottomSheet
          value={customFeeRate?.toString() || ''}
          inputMode="decimal"
          onChangeText={text => {
            // TODO: review input sanitation for the whole app
            const normalized = normalizeFeeRateInput(text);
            if (onCustomFeeChange) onCustomFeeChange(normalized);
          }}
          label={customFeeLabel}
        />
      )}
    </Column>
  );
};
