import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './types';

interface Props {
  economicGroup?: Types.DeepPartial<Types.EconomicGroup>;
  translations: Types.Translations['economicGroup'] & {
    memory: Types.Translations['memory'];
    step: Types.Translations['step'];
  };
}

export const EconomicGroup = ({
  economicGroup,
  translations,
}: Props): React.JSX.Element => {
  return (
    <>
      <ActivityDetailItem label={translations.title} />
      {economicGroup?.minFeeA && (
        <ActivityDetailItem
          label={translations.minFeeA}
          value={economicGroup.minFeeA}
        />
      )}
      {economicGroup?.minFeeB && (
        <ActivityDetailItem
          label={translations.minFeeB}
          value={economicGroup.minFeeB}
        />
      )}
      {economicGroup?.keyDeposit && (
        <ActivityDetailItem
          label={translations.keyDeposit}
          value={economicGroup.keyDeposit}
        />
      )}
      {economicGroup?.poolDeposit && (
        <ActivityDetailItem
          label={translations.poolDeposit}
          value={economicGroup.poolDeposit}
        />
      )}
      {economicGroup?.rho && (
        <ActivityDetailItem
          label={translations.rho}
          value={economicGroup.rho}
        />
      )}
      {economicGroup?.tau && (
        <ActivityDetailItem
          label={translations.tau}
          value={economicGroup.tau}
        />
      )}
      {economicGroup?.minPoolCost && (
        <ActivityDetailItem
          label={translations.minPoolCost}
          value={economicGroup.minPoolCost}
        />
      )}
      {economicGroup?.coinsPerUTxOByte && (
        <ActivityDetailItem
          label={translations.coinsPerUTxOByte}
          value={economicGroup.coinsPerUTxOByte}
        />
      )}
      {economicGroup?.price && (
        <>
          <ActivityDetailItem label={translations.prices} />
          <ActivityDetailItem
            label={translations.memory}
            value={economicGroup.price.memory}
          />
          <ActivityDetailItem
            label={translations.step}
            value={economicGroup.price.step}
          />
        </>
      )}
    </>
  );
};
