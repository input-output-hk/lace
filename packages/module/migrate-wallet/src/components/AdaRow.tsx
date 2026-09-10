import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { IconBadge } from './IconBadge';

/**
 * Sized against the amount beside it rather than the card: the coin denominates
 * the figure, so it belongs on that line, not in a rail of its own.
 */
const COIN_SIZE = 40;
const CARET_SIZE = 16;
/** Lands the nested terms under the amount, clear of the coin. */
const BREAKDOWN_INSET = COIN_SIZE + spacing.S;

/**
 * ADA, as the first and largest line of what arrives. The rest of the list is
 * the native assets, so this is the same kind of row as those — one asset, one
 * amount — set larger because it is the figure the flow is about.
 *
 * The terms behind it hang off this row rather than sitting beside the assets:
 * they are how this number was reached, and as siblings of the token rows they
 * read as more things arriving.
 */
export const AdaRow = ({
  amount,
  valueTestID,
  children,
  testID,
}: {
  amount: string;
  valueTestID: string;
  /** The terms behind the amount, revealed under it. */
  children?: React.ReactNode;
  testID?: string;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Column gap={spacing.M}>
      <Pressable
        onPress={
          children
            ? () => {
                setIsExpanded(open => !open);
              }
            : undefined
        }
        accessibilityRole={children ? 'button' : undefined}
        accessibilityState={children ? { expanded: isExpanded } : undefined}
        testID={testID}>
        <Row gap={spacing.S} alignItems="center">
          <IconBadge name="Cardano" size={COIN_SIZE} tone="cardano" />
          <Text.L style={styles.amount} testID={valueTestID}>
            {amount}
          </Text.L>
          {children !== undefined && (
            // Labelled, and the label does not toggle: the caret's direction
            // already carries the state, so a word that flips with it is a
            // second thing to keep in step. A bare caret on the one row of the
            // list that has one does not say what it opens.
            <Row
              gap={spacing.XS}
              alignItems="center"
              style={
                theme.name === 'dark' ? styles.disclosureDimmed : undefined
              }>
              <Text.XS variant="tertiary">
                {t('v2.generic.label.details')}
              </Text.XS>
              <Icon
                name={isExpanded ? 'CaretUp' : 'CaretDown'}
                size={CARET_SIZE}
                color={theme.text.tertiary}
              />
            </Row>
          )}
        </Row>
      </Pressable>
      {isExpanded && (
        <Column gap={spacing.S} style={styles.breakdown}>
          {children}
        </Column>
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  // Takes the row's spare width, so the disclosure sits on the card's right
  // edge, in line with the asset amounts below it.
  amount: {
    flex: 1,
  },
  // Dark only, the same workaround `NoteItem` documents: `text.tertiary` is
  // #CCCCCC there, which still reads as loud as body copy. Opacity rather than
  // a literal colour, so the caret recedes with the label and both keep
  // deriving from the palette.
  disclosureDimmed: {
    opacity: 0.75,
  },
  breakdown: {
    paddingLeft: BREAKDOWN_INSET,
  },
});
