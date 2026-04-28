import React from 'react';
import { StyleSheet } from 'react-native';

import { Divider, Row, Text } from '../../atoms';

export const DetailRows = ({ data }: { data: object }) => {
  return (
    <>
      {Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object')
          return (
            <>
              <Divider />
              <DetailRows data={value as object} />
            </>
          );
        return (
          <Row>
            <Text.XS style={styles.flex}>{key}</Text.XS>
            <Text.XS style={styles.flex}>{value}</Text.XS>
          </Row>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
