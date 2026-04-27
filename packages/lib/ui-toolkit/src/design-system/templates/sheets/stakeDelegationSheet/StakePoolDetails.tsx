import type { ImageSourcePropType, StyleProp, TextStyle } from 'react-native';

import React from 'react';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTag, Divider, Text } from '../../../atoms';
import {
  LineSimple,
  LineWithValueAndExchange,
  ProgressBar,
  type ProgressBarColor,
  type ValueWithExchange,
} from '../../../molecules';

interface StyleProps {
  saturationTextStyle: StyleProp<TextStyle>;
}

interface StakeKeyProps {
  label: string;
  value: string;
}

interface SaturationProps {
  label: string;
  percentage: number;
  color: ProgressBarColor;
}

interface MarginProps {
  label: string;
  value: string;
}

interface PledgeProps {
  label: string;
  value: ValueWithExchange;
}

interface CostProps {
  label: string;
  value: ValueWithExchange;
}

interface DelegatedStakeProps {
  label: string;
  value: ValueWithExchange;
}

interface SourceAccountProps {
  label: string;
  account: {
    name: string;
    avatar?: ImageSourcePropType;
    avatarFallback?: string;
  };
}

interface ExpiresByProps {
  label: string;
  value: {
    date: string;
    time: string;
  };
}

interface StakePoolDetailsProps {
  stakeKey: StakeKeyProps;
  saturation: SaturationProps;
  margin: MarginProps;
  pledge: PledgeProps;
  cost: CostProps;
  delegatedStake: DelegatedStakeProps;
  sourceAccount: SourceAccountProps;
  expiresBy: ExpiresByProps;
  styleProps: StyleProps;
}

export const StakePoolDetails = ({
  stakeKey,
  saturation,
  margin,
  pledge,
  cost,
  delegatedStake,
  sourceAccount,
  expiresBy,
  styleProps,
}: StakePoolDetailsProps) => {
  return (
    <Column gap={spacing.M}>
      {/* Stake key */}
      <LineSimple label={stakeKey.label} content={stakeKey.value} />

      <Divider />

      {/* Saturation */}
      <Column gap={spacing.S}>
        <LineSimple
          label={saturation.label}
          content={`${saturation.percentage}%`}
          contentStyle={styleProps.saturationTextStyle}
        />
        <ProgressBar
          progress={saturation.percentage}
          color={saturation.color}
          showPercentage={false}
        />
      </Column>

      <Divider />

      {/* Margin */}
      <LineSimple
        label={margin.label}
        content={margin.value}
        contentStyle={styleProps.saturationTextStyle}
      />

      <Divider />

      {/* Pledge */}
      <LineWithValueAndExchange label={pledge.label} value={pledge.value} />

      <Divider />

      {/* Cost */}
      <LineWithValueAndExchange label={cost.label} value={cost.value} />

      <Divider />

      {/* Delegated stake */}
      <LineWithValueAndExchange
        label={delegatedStake.label}
        value={delegatedStake.value}
      />

      <Divider />

      {/* Source Account */}
      <LineSimple
        label={sourceAccount.label}
        content={
          <CustomTag
            label={sourceAccount.account.name}
            imageSource={sourceAccount.account.avatar}
            backgroundType="semiTransparent"
            color="black"
          />
        }
      />

      <Divider />

      {/* Expires by */}
      <LineSimple
        label={expiresBy.label}
        content={
          <Column alignItems="flex-end">
            <Text.M>{expiresBy.value.date}</Text.M>
            <Text.S variant="secondary">{expiresBy.value.time}</Text.S>
          </Column>
        }
      />
    </Column>
  );
};
