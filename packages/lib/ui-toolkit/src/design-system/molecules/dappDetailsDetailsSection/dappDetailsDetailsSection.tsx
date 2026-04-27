import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Column, Row, Text } from '../../atoms';
import { parseHtmlTextBlocks } from '../../util';

import type { Theme } from '../../../design-tokens';

export type DappDetailsDetailsSectionProps = {
  title: string;
  descriptionHtml: string;
};

type RichTextSpan = { strong: boolean; text: string };
type RichTextBlock = {
  type: 'bullet' | 'heading' | 'paragraph';
  spans: RichTextSpan[];
  text: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRichTextSpan = (value: unknown): value is RichTextSpan => {
  if (!isRecord(value)) return false;
  return typeof value.strong === 'boolean' && typeof value.text === 'string';
};

const isRichTextBlockType = (value: unknown): value is RichTextBlock['type'] =>
  value === 'bullet' || value === 'heading' || value === 'paragraph';

const isRichTextSpans = (value: unknown): value is RichTextSpan[] =>
  Array.isArray(value) && value.every(isRichTextSpan);

const isRichTextBlock = (value: unknown): value is RichTextBlock => {
  if (!isRecord(value)) return false;
  if (!isRichTextBlockType(value.type)) return false;
  if (!isRichTextSpans(value.spans)) return false;
  return typeof value.text === 'string';
};

const parseHtmlTextBlocksSafe = (html: string): RichTextBlock[] => {
  const parse = parseHtmlTextBlocks as unknown as (input: string) => unknown;
  const result = parse(html);
  if (!Array.isArray(result)) return [];
  return result.filter(isRichTextBlock);
};

const InlineRichText = memo(
  ({
    blockIndex,
    size,
    spans,
    variant,
  }: {
    blockIndex: number;
    size: 'm' | 's';
    spans: RichTextSpan[];
    variant: 'primary' | 'secondary';
  }) => {
    return spans.map((span, spanIndex) => {
      const key = `${blockIndex}-${spanIndex}`;
      const textVariant = span.strong ? 'primary' : variant;

      return size === 'm' ? (
        <Text.M
          key={key}
          variant={textVariant}
          weight={span.strong ? 'bold' : undefined}>
          {span.text}
        </Text.M>
      ) : (
        <Text.S
          key={key}
          variant={textVariant}
          weight={span.strong ? 'bold' : undefined}>
          {span.text}
        </Text.S>
      );
    });
  },
);

export const DappDetailsDetailsSection = memo(
  ({ title, descriptionHtml }: DappDetailsDetailsSectionProps) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const blocks = useMemo(
      () => parseHtmlTextBlocksSafe(descriptionHtml),
      [descriptionHtml],
    );

    return (
      <Column
        style={staticStyles.section}
        testID="dapp-details-description-wrapper">
        <Text.M
          testID="dapp-details-description-title"
          variant="secondary"
          style={styles.sectionTitle}>
          {title}
        </Text.M>
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            return (
              <Text.M
                testID="dapp-details-description-content"
                key={index}
                style={staticStyles.paragraph}
                variant="primary">
                <InlineRichText
                  blockIndex={index}
                  size="m"
                  spans={block.spans}
                  variant="primary"
                />
              </Text.M>
            );
          }

          if (block.type === 'bullet') {
            return (
              <Row
                testID="dapp-details-description-content"
                key={index}
                alignItems="flex-start"
                style={staticStyles.bulletRow}>
                <Text.S variant="tertiary">{'\u2022'}</Text.S>
                <Text.S style={staticStyles.bulletText} variant="secondary">
                  <InlineRichText
                    blockIndex={index}
                    size="s"
                    spans={block.spans}
                    variant="secondary"
                  />
                </Text.S>
              </Row>
            );
          }

          return (
            <Text.S
              testID="dapp-details-description-content"
              key={index}
              style={staticStyles.paragraph}
              variant="secondary">
              <InlineRichText
                blockIndex={index}
                size="s"
                spans={block.spans}
                variant="secondary"
              />
            </Text.S>
          );
        })}
      </Column>
    );
  },
);

const staticStyles = StyleSheet.create({
  section: {
    gap: spacing.M,
  },
  paragraph: {
    marginBottom: spacing.S,
  },
  bulletRow: {
    gap: spacing.S,
    marginBottom: spacing.S,
  },
  bulletText: {
    flex: 1,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      color: theme.text.primary,
      marginBottom: spacing.XS,
    },
  });
