import type { ViewStyle } from 'react-native';

import {
  Column,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { SMALL_LINE_HEIGHT, wizardText } from './wizard-styles';

import type { IconName } from '@lace-lib/ui-toolkit';

const ICON_SIZE = 16;

export interface NoteItemProps {
  text: string;
  /**
   * What the note is about. Defaults to the generic aside marker; a specific
   * glyph is what lets a run of these be told apart without reading them.
   */
  icon?: IconName;
  testID?: string;
}

/**
 * An aside about the flow: true, worth reading once, but neither a step nor a
 * warning. The icon is what marks it as an aside — without it the sentence
 * reads as one more paragraph of body copy, which is how it earns being set
 * quieter than the content around it.
 */
export const NoteItem = ({
  text,
  icon = 'InformationCircle',
  testID,
}: NoteItemProps) => {
  const { theme } = useTheme();

  return (
    <Row
      gap={spacing.S}
      style={theme.name === 'dark' ? styles.itemDimmed : styles.item}
      testID={testID}>
      <Column style={styles.icon}>
        <Icon name={icon} size={ICON_SIZE} color={theme.text.tertiary} />
      </Column>
      <Column style={styles.textWrapper}>
        <Text.S variant="tertiary" style={wizardText.smallLine}>
          {text}
        </Text.S>
      </Column>
    </Row>
  );
};

/**
 * Plain objects and ui-toolkit primitives rather than `StyleSheet` and `View`,
 * so this stays out of react-native's runtime graph: the steps that use it are
 * unit-testable with ui-toolkit mocked, and a react-native import here would
 * be the only thing dragging it back in.
 */
const item: ViewStyle = {
  alignItems: 'flex-start',
};

const styles: Record<
  'icon' | 'item' | 'itemDimmed' | 'textWrapper',
  ViewStyle
> = {
  item,
  // Dark only. `text.tertiary` is #CCCCCC there, which still reads as loud as
  // body copy against the page; light's #777777 already sits back on its own.
  // Opacity rather than a literal colour so the icon dims with the text and
  // the note keeps deriving from the palette. Lands near #A0A0A0 on the page
  // background — about 6:1, so it recedes without dropping under AA, which
  // these notes cannot afford.
  //
  // This is a local workaround for the text ramp being hand-picked per theme
  // rather than derived from target contrast ratios: dark's three steps all
  // land between 16.7:1 and 10.4:1, so none of them is actually quiet. Delete
  // this once the ramp is rebuilt and `tertiary` recedes on its own.
  itemDimmed: { ...item, opacity: 0.75 },
  // Centred against the first line, so the icon does not ride high against a
  // note that wraps.
  icon: { marginTop: (SMALL_LINE_HEIGHT - ICON_SIZE) / 2 },
  textWrapper: { flex: 1 },
};
