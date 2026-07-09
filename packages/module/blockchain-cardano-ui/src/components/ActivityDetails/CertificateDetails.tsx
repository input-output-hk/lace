import { useTranslation } from '@lace-contract/i18n';
import { Column, Row, shouldTruncateText, Text } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { useStakePool } from '../../hooks';
import { getPoolIdFromCertificate } from '../../utils/certificates';

import { ActivityDetailItem } from './ActivityDetailItem';
import { buildCertificateItems } from './build-certificate-items';

import type { Cardano } from '@cardano-sdk/core';

export const CertificateDetails = ({
  certificate,
  coinSymbol = 'ADA',
  testID,
  shouldShowDivider = false,
}: {
  certificate: Cardano.HydratedCertificate;
  coinSymbol?: string;
  testID?: string;
  shouldShowDivider?: boolean;
}) => {
  const { t } = useTranslation();
  const poolId = getPoolIdFromCertificate(certificate);
  const pool = useStakePool(poolId);

  const poolDescription = useMemo(() => {
    if (!poolId) return undefined;
    if (!pool) return poolId;

    const { poolName: name, ticker } = pool;

    if (!name && !ticker) return poolId;

    return (
      <Column>
        <Row justifyContent="flex-end">
          <Text.M>
            {name ? (ticker ? `${name} (${ticker})` : name) : `(${ticker})`}
          </Text.M>
        </Row>
        <Row justifyContent="flex-end">
          <Text.M>{shouldTruncateText(poolId)}</Text.M>
        </Row>
      </Column>
    );
  }, [poolId, pool]);

  const rendering = useMemo(
    () =>
      buildCertificateItems(certificate, { t, coinSymbol, poolDescription }),
    [certificate, t, coinSymbol, poolDescription],
  );

  if (rendering.kind === 'fallback') {
    return (
      <Column testID={testID}>
        <Text.M>{rendering.typeLabel}</Text.M>
        <Text.M variant="secondary">{rendering.rawJson}</Text.M>
      </Column>
    );
  }

  const { items } = rendering;
  const lastIndex = items.length - 1;

  return (
    <Column testID={testID}>
      {items.map((item, index) => (
        <ActivityDetailItem
          key={`${item.label}-${index}`}
          label={item.label}
          value={item.value}
          shouldShowDivider={index === lastIndex && shouldShowDivider}
        />
      ))}
    </Column>
  );
};
