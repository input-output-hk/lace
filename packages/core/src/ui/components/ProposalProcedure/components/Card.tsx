import React from 'react';
import { Cell, Grid, Flex, Card as UICard, Box, sx, Text, TextLink } from '@lace/ui';

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
    <>
      <Cell>
        <Flex>
          <Text.Body.Small className={textCss} weight="$semibold">
            {props.label}
          </Text.Body.Small>
        </Flex>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end">
          {props.url ? (
            <a href={props.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <TextLink label={props.value} />
            </a>
          ) : (
            <Text.Body.Small className={textCss} weight="$semibold">
              {props.value}
            </Text.Body.Small>
          )}
        </Flex>
      </Cell>
    </>
  );

  return (
    <Cell>
      <Box mt="$16">
        <UICard.Outlined>
          <Flex p="$20" flexDirection="column">
            {title && (
              <Box mb="$24">
                <Text.Body.Small className={textCss} weight="$bold">
                  {title}
                </Text.Body.Small>
              </Box>
            )}
            <Grid columns="$2" gutters="$20">
              {data.map((props) => renderRow(props))}
            </Grid>
          </Flex>
        </UICard.Outlined>
      </Box>
    </Cell>
  );
};
