import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Row, Text } from '../../atoms';

export interface LineSimpleProps {
  content: ReactNode | string;
  /** Optional additional style for text content. Ignored if content is a React node. */
  contentStyle?: StyleProp<TextStyle>;
  label: string;
}

export const LineSimple = ({
  content,
  contentStyle,
  label,
}: LineSimpleProps) => {
  const styles = useMemo(() => getStyles(), []);
  const textStyle = useMemo(
    () => [styles.textStyle, contentStyle],
    [contentStyle],
  );

  return (
    <Row alignItems="center" justifyContent="space-between">
      <Text.M variant="secondary">{label}</Text.M>
      {typeof content === 'string' ? (
        <Text.M style={textStyle}>{content}</Text.M>
      ) : (
        content
      )}
    </Row>
  );
};

const getStyles = () =>
  StyleSheet.create({
    textStyle: {
      flex: 1,
      textAlign: 'right',
    },
  });
