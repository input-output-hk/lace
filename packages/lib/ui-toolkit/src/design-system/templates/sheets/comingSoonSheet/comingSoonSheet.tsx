import React from 'react';
import { StyleSheet } from 'react-native';

import { EmptyFeatureMessage } from '../../../molecules';
import { Sheet } from '../../../organisms';

interface ComingSoonSheetTemplateProps {
  featureName: string;
}

export const ComingSoonSheetTemplate = ({
  featureName,
}: ComingSoonSheetTemplateProps) => {
  return (
    <Sheet.Scroll contentContainerStyle={styles.container}>
      <EmptyFeatureMessage featureName={featureName} />
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 500,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
