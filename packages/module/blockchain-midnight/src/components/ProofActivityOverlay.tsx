import { useTranslation } from '@lace-contract/i18n';
import {
  Icon,
  Loader,
  Modal,
  radius,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks/lace-context';

import { ProgressStep } from './ProgressStep';

import type { ProofActivity } from '@lace-contract/midnight-context';

interface ActivityProps {
  activity: ProofActivity;
}

const ActivityRow = ({ activity }: ActivityProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dismiss = useDispatchLaceAction(
    'midnightContext.proofActivityDismissRequested',
  );
  const onDismiss = useCallback(
    () => dismiss(activity.id),
    [activity.id, dismiss],
  );
  const isTerminal =
    activity.status === 'succeeded' || activity.status === 'failed';
  const color =
    activity.status === 'failed'
      ? theme.background.negative
      : theme.background.positive;
  return (
    <View style={styles.row} testID={`proof-activity-${activity.id}`}>
      {activity.steps ? null : isTerminal ? (
        <Icon
          name={activity.status === 'failed' ? 'AlertTriangle' : 'Checkmark'}
          color={color}
          size={18}
        />
      ) : (
        <Loader size={18} />
      )}
      <View style={styles.rowText}>
        <Text.S>
          {t(`midnight.proof-activity.${activity.kind}`, {
            number: activity.number,
          })}
        </Text.S>
        {(!activity.steps ||
          isTerminal ||
          activity.status === 'queued' ||
          activity.status === 'preparing') && (
          <Text.XS variant="secondary">
            {t(`midnight.proof-activity.${activity.status}`)}
          </Text.XS>
        )}
        {activity.steps?.map(step => (
          <ProgressStep
            key={step.id}
            status={step.status}
            label={t(
              `midnight.proof-activity.${
                step.id === 'proving' ? 'generating' : step.id
              }`,
            )}
            testID={`proof-activity-${activity.id}-step-${step.id}-${step.status}`}
          />
        ))}
      </View>
      {isTerminal && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('v2.generic.dismiss')}
          onPress={onDismiss}
          style={styles.dismiss}
          testID={`proof-activity-dismiss-${activity.id}`}>
          <Icon name="Cancel" size={18} />
        </Pressable>
      )}
    </View>
  );
};

interface ActivityListProps {
  activities: ProofActivity[];
}

const ActivityIndicator = ({ activities }: ActivityListProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const failed = activities.filter(
    activity => activity.status === 'failed',
  ).length;
  const queued = activities.filter(
    activity => activity.status === 'queued',
  ).length;
  const active =
    activities.find(activity => activity.status === 'running') ??
    activities.find(activity => activity.status === 'preparing') ??
    activities.find(activity => activity.status === 'receiving') ??
    activities.find(activity => activity.status === 'queued');
  const status = active?.status ?? (failed ? 'failed' : 'succeeded');
  const label =
    status === 'running'
      ? t(
          active?.kind === 'check' ||
            active?.steps?.some(
              step => step.id === 'checking' && step.status === 'running',
            )
            ? 'midnight.proof-activity.checking'
            : 'midnight.proof-activity.generating',
        )
      : status === 'queued'
      ? t('midnight.proof-activity.queued-count', { count: queued })
      : t(`midnight.proof-activity.${status}`);
  const color = failed
    ? theme.background.negative
    : active
    ? theme.text.primary
    : theme.background.positive;
  return (
    <View style={styles.container} testID="proof-activities">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={open}
        style={[styles.indicator, { backgroundColor: theme.background.page }]}
        testID="proof-activity-indicator">
        {active ? (
          <Loader size={16} />
        ) : (
          <Icon
            name={failed ? 'AlertTriangle' : 'Checkmark'}
            color={color}
            size={16}
          />
        )}
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <Text.XS numberOfLines={1}>{label}</Text.XS>
          {!!queued && status !== 'queued' && (
            <Text.XS variant="secondary">
              {t('midnight.proof-activity.queued-count', { count: queued })}
            </Text.XS>
          )}
          {!!failed && (
            <Text.XS variant="negative">
              {t('midnight.proof-activity.failed-count', { count: failed })}
            </Text.XS>
          )}
        </View>
        <Icon name="CaretUp" size={16} />
      </Pressable>
      {isOpen && (
        <Modal
          visible
          title={t('midnight.proof-activity.title')}
          onClose={close}
          testIdPrefix="proof-activity-details"
          description={
            <ScrollView style={styles.details}>
              {activities.map(activity => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </ScrollView>
          }
        />
      )}
    </View>
  );
};

export const ProofActivityOverlay = () => {
  const activities = useLaceSelector('midnightContext.selectProofActivities');
  return activities.length ? (
    <ActivityIndicator activities={activities} />
  ) : null;
};

const styles = StyleSheet.create({
  // This occupies layout space below navigation, so wallet controls stay reachable.
  container: {
    flexShrink: 0,
    paddingHorizontal: spacing.S,
    paddingVertical: spacing.XS,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.S,
    borderRadius: radius.M,
    paddingHorizontal: spacing.S,
    minHeight: 36,
  },
  summary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.S,
    flexWrap: 'wrap',
  },
  details: { maxHeight: 280, width: 280, maxWidth: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.S,
    paddingVertical: spacing.S,
  },
  rowText: { flex: 1, gap: spacing.XS },
  dismiss: { padding: spacing.S },
});
