import React from 'react';
import { Grid, Flex, Card as UICard, Box, sx, Text, TextLink, Tooltip, Cell } from '@input-output-hk/lace-ui-toolkit';
import styles from './Card.module.scss';

interface Item {
  label: string;
  value: string;
  tooltip?: string;
  url?: string;
}

interface Props {
  title?: string;
  tooltip?: string;
  data: Item[];
}

export const Card = ({ title, tooltip, data }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  const renderRow = (props: Item) => (
    <React.Fragment key={props.label}>
      <Cell>
        <Flex>
          {props.tooltip ? (
            <Tooltip align="center" side="top" label={props.tooltip}>
              <Text.Body.Small className={textCss} weight="$semibold">
                {props.label}
              </Text.Body.Small>
            </Tooltip>
          ) : (
            <Text.Body.Small className={textCss} weight="$semibold">
              {props.label}
            </Text.Body.Small>
          )}
        </Flex>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end">
          {props.url ? (
            <a href={props.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <TextLink label={props.value} />
            </a>
          ) : (
            <Text.Body.Small className={`${textCss} ${styles.text}`} weight="$semibold">
              {props.value}
            </Text.Body.Small>
          )}
        </Flex>
      </Cell>
    </React.Fragment>
  );

  const renderTitle = () => {
    if (!title) return <></>;

    if (tooltip) {
      return (
        <Box mb="$24">
          <Tooltip align="center" side="top" label={tooltip}>
            <Text.Body.Small className={textCss} weight="$bold">
              {title}
            </Text.Body.Small>
          </Tooltip>
        </Box>
      );
    }

    return (
      <Box mb="$24">
        <Text.Body.Small className={textCss} weight="$bold">
          {title}
        </Text.Body.Small>
      </Box>
    );
  };

  return (
    <Cell>
      <Box mt="$16">
        <UICard.Outlined>
          <Flex p="$20" flexDirection="column">
            {renderTitle()}
            <Grid columns="$2" gutters="$20">
              {data.map((props) => renderRow(props))}
            </Grid>
          </Flex>
        </UICard.Outlined>
      </Box>
    </Cell>
  );
};
