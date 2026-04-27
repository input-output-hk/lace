import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { useLaceSelector, useDispatchLaceAction } from './hooks';

import type { FeatureMetadata } from '@lace-contract/feature';

const FeatureMetadataList: React.ComponentType<{
  features: FeatureMetadata[];
}> = ({ features }) =>
  features.map(({ name, description }) => (
    <div key={name}>
      <h4>{name}</h4>
      <p>{description}</p>
    </div>
  ));

export const ReloadPrompt: React.ComponentType = () => {
  // This is not storybook-friendly and is an anti-pattern,
  // but this is component is only used for a demo, to be deleted.
  const { t } = useTranslation();
  const nextFeatures = useLaceSelector('features.selectNextFeaturesMetadata');
  const reloadApplication = useDispatchLaceAction('app.reloadApplication');
  if (!nextFeatures) return null;
  return (
    <div>
      <h3>{t('features.added')}</h3>
      <FeatureMetadataList features={nextFeatures.added} />
      <h3>{t('features.removed')}</h3>
      <FeatureMetadataList features={nextFeatures.removed} />
      <button onClick={() => reloadApplication()}>{t('app.reload')}</button>
    </div>
  );
};
