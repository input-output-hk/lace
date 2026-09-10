import { Card, Loader, Row, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { cardLayout } from './card-styles';
import { IconBadge } from './IconBadge';
import { wizardText } from './wizard-styles';

import type { IconName } from '@lace-lib/ui-toolkit';

const BADGE_SIZE = 32;
const SPINNER_SIZE = 22;
/** Enough to read as "not yet", without becoming unreadable on either theme. */
const UPCOMING_OPACITY = 0.45;

export interface Stage {
  /** What the stage is about — shown while the stage is still upcoming. */
  icon: IconName;
  label: string;
}

export interface StageProgressCardProps {
  /** In running order. */
  stages: Stage[];
  /** The stage currently running; everything before it reads as done. */
  activeIndex: number;
  testID?: string;
}

/**
 * A wait rendered as a position in a process, in the flow's own card language:
 * done stages keep a check, the running stage carries the spinner, and what is
 * still to come sits dimmed. One glance answers the question a bare spinner
 * leaves open — "is it stuck, or just not my turn yet?".
 */
export const StageProgressCard = ({
  stages,
  activeIndex,
  testID,
}: StageProgressCardProps) => (
  <Card cardStyle={cardLayout.card} testID={testID}>
    {stages.map((stage, index) => {
      const state =
        index < activeIndex
          ? 'done'
          : index === activeIndex
          ? 'active'
          : 'upcoming';
      return (
        <Row
          key={stage.label}
          gap={spacing.M}
          alignItems="center"
          style={state === 'upcoming' ? styles.upcoming : undefined}
          testID={testID === undefined ? undefined : `${testID}-row-${index}`}>
          {state === 'active' ? (
            <View
              style={styles.spinnerBox}
              testID={
                testID === undefined ? undefined : `${testID}-spinner-${index}`
              }>
              <Loader size={SPINNER_SIZE} />
            </View>
          ) : (
            <IconBadge name={state === 'done' ? 'Checkmark' : stage.icon} />
          )}
          <View style={cardLayout.body}>
            <Text.S
              variant={state === 'active' ? undefined : 'tertiary'}
              style={wizardText.smallLine}>
              {stage.label}
            </Text.S>
          </View>
        </Row>
      );
    })}
  </Card>
);

const styles = StyleSheet.create({
  // Same footprint as the badge it replaces, so the rows do not shift as the
  // spinner moves down the list.
  spinnerBox: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcoming: {
    opacity: UPCOMING_OPACITY,
  },
});
