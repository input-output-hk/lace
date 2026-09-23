import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  footerHeight,
  Loader,
  Sheet,
  StatusSheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { CnightDesignationForm } from './CnightDesignationForm';
import { CnightDesignationReview } from './CnightDesignationReview';
import { useCnightDesignationSheet } from './useCnightDesignationSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// The success screen is submission-tense and action-specific: a stop must not
// read as a "designation submitted". Keyed by the flow's resolved action.
const SUCCESS_COPY = {
  designate: {
    title: 'v2.cnight-designation.success.designate.title',
    body: 'v2.cnight-designation.success.designate.body',
  },
  update: {
    title: 'v2.cnight-designation.success.update.title',
    body: 'v2.cnight-designation.success.update.body',
  },
  deregister: {
    title: 'v2.cnight-designation.success.deregister.title',
    body: 'v2.cnight-designation.success.deregister.body',
  },
} as const;

export const CnightDesignationSheet = (
  props: SheetScreenProps<SheetRoutes.CnightDesignation>,
) => {
  const { t } = useTranslation();
  const {
    step,
    actionMode,
    isDesignated,
    isDetecting,
    isDetectionFailed,
    canRetryDetection,
    retryDetection,
    currentTargetHex,
    currentWalletTargetId,
    targetMode,
    setTargetMode,
    walletTargets,
    isWalletTargetAvailable,
    selectedTargetId,
    setSelectedTargetId,
    externalAddress,
    setExternalAddress,
    externalTargetStatus,
    isFormLocked,
    canContinue,
    canStop,
    isSameAsCurrentTarget,
    isUpdateBlocked,
    feeFormatted,
    feeFiatFormatted,
    reviewTarget,
    txId,
    errorTranslationKeys,
    errorDetail,
    handleContinue,
    handleStopGenerating,
    handleConfirm,
    handleBackToForm,
    handleClose,
  } = useCnightDesignationSheet(props);

  const { setOptions } = props.navigation;

  useEffect(() => {
    if (step === 'review') {
      setOptions({
        header: (
          <Sheet.Header
            title={t('v2.cnight-designation.review.title')}
            leftIconOnPress={handleBackToForm}
            testID="cnight-designation-sheet-header"
          />
        ),
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: t('v2.cnight-designation.review.confirm'),
              onPress: handleConfirm,
              testID: 'cnight-designation-confirm-button',
            }}
          />
        ),
      });
      return;
    }

    if (step === 'success' || step === 'error') {
      setOptions({
        header: (
          <Sheet.Header
            title={
              step === 'success'
                ? t(SUCCESS_COPY[actionMode].title)
                : t('v2.cnight-designation.error.title')
            }
            testID="cnight-designation-sheet-header"
          />
        ),
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: t('v2.cnight-designation.close'),
              onPress: handleClose,
              testID: 'cnight-designation-close-button',
            }}
          />
        ),
      });
      return;
    }

    // Confirm → submit spans AwaitingConfirmation + Processing (both map to
    // 'processing'), the window during which the auth modal is open over a
    // full-screen loader. Show a neutral header and NO footer so the manage
    // chrome (title + "Change target" / "Stop generating") doesn't render
    // behind the modal — the else-branch below would otherwise install it.
    if (step === 'processing') {
      setOptions({
        header: (
          <Sheet.Header
            title={t('v2.cnight-designation.review.title')}
            testID="cnight-designation-sheet-header"
          />
        ),
        footer: undefined,
      });
      return;
    }

    // Detection failed: the form must not be reachable (designate-vs-manage is
    // unknown), so this replaces the manage/form chrome below. Retry is primary,
    // Close secondary — a dead-end error screen would strand the sheet.
    if (isDetectionFailed) {
      setOptions({
        header: (
          <Sheet.Header
            title={t('v2.cnight-designation.detection.error.title')}
            leftIconOnPress={handleClose}
            testID="cnight-designation-sheet-header"
          />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('v2.cnight-designation.close'),
              onPress: handleClose,
              testID: 'cnight-designation-close-button',
            }}
            primaryButton={{
              label: t('v2.cnight-designation.detection.error.retry'),
              onPress: retryDetection,
              disabled: !canRetryDetection,
              testID: 'cnight-designation-retry-detection-button',
            }}
          />
        ),
      });
      return;
    }

    setOptions({
      header: (
        <Sheet.Header
          title={
            isDesignated
              ? t('v2.cnight-designation.manage.title')
              : t('v2.cnight-designation.form.title')
          }
          leftIconOnPress={handleClose}
          testID="cnight-designation-sheet-header"
        />
      ),
      // Actions are pinned in the footer (design-system convention, matches the
      // review/success steps + send-flow). No footer while detection resolves —
      // designate-vs-manage isn't known yet. Manage: primary "Change target" +
      // a secondary "Stop generating DUST" stacked below.
      footer: isDetecting ? undefined : (
        <Sheet.Footer
          vertical={isDesignated}
          primaryButton={{
            label: isDesignated
              ? t('v2.cnight-designation.update.continue')
              : t('v2.cnight-designation.form.continue'),
            onPress: handleContinue,
            disabled: !canContinue,
            // While the tx builds, keep the form visible and spin the button
            // that was pressed (designate/update = primary) instead of blanking
            // the sheet to a full-screen loader.
            loading: step === 'building' && actionMode !== 'deregister',
            testID: 'cnight-designation-continue-button',
          }}
          secondaryButton={
            isDesignated
              ? {
                  label: t('v2.cnight-designation.deregister.continue'),
                  onPress: handleStopGenerating,
                  disabled: !canStop,
                  loading: step === 'building' && actionMode === 'deregister',
                  testID: 'cnight-designation-stop-button',
                }
              : undefined
          }
        />
      ),
    });
  }, [
    step,
    actionMode,
    isDesignated,
    isDetecting,
    isDetectionFailed,
    canContinue,
    canStop,
    canRetryDetection,
    retryDetection,
    setOptions,
    t,
    handleBackToForm,
    handleConfirm,
    handleContinue,
    handleStopGenerating,
    handleClose,
  ]);

  // The footer is a navigator-overlay slot (setOptions), not part of the scroll
  // region, so the scroll content must reserve its height or the tail of the
  // (taller) manage view sits hidden behind it. Match the footer actually
  // rendered: vertical (two stacked buttons) when designated, horizontal
  // otherwise, none while detection resolves (no footer).
  const scrollContentStyle = useMemo(
    () => ({
      paddingBottom: isDetecting
        ? undefined
        : isDesignated
        ? footerHeight.vertical
        : footerHeight.horizontal,
    }),
    [isDetecting, isDesignated],
  );

  // The sheet-wide loading states share one full-height centered loader: the
  // scan resolving before designate-vs-manage is known, and the post-confirm
  // submit. The scan's loader is confined to the form step so a live flow keeps
  // its own screen — a submitted designation turns the scan unresolved again
  // (the entry goes settling), and the success screen carrying the txId has to
  // outlive that. 'building' keeps the form up with its footer button spinning.
  if (step === 'processing' || (isDetecting && step === 'form')) {
    return (
      <Column
        justifyContent="center"
        alignItems="center"
        style={styles.loadingContainer}>
        <Loader />
      </Column>
    );
  }

  if (step === 'success') {
    return (
      <StatusSheet
        body={t(SUCCESS_COPY[actionMode].body, { txId: txId ?? '' })}
        icon={{ name: 'Checkmark', variant: 'solid' }}
        testID="cnight-designation-success"
      />
    );
  }

  if (step === 'error') {
    return (
      <StatusSheet
        body={
          errorTranslationKeys
            ? t(errorTranslationKeys.subtitle)
            : t('v2.cnight-designation.error.generic')
        }
        detail={errorDetail}
        icon={{ name: 'Sad', variant: 'solid' }}
        testID="cnight-designation-error"
      />
    );
  }

  if (step === 'review') {
    return (
      <CnightDesignationReview
        actionMode={actionMode}
        isOwnTarget={reviewTarget.isOwn}
        accountName={reviewTarget.accountName}
        dustAddress={reviewTarget.address}
        feeFormatted={feeFormatted}
        feeFiatFormatted={feeFiatFormatted}
      />
    );
  }

  // Ordered to match the footer arms above: a live flow's own screens win, and
  // the failed scan replaces only the designate/manage form.
  if (isDetectionFailed) {
    return (
      <StatusSheet
        body={t('v2.cnight-designation.detection.error.subtitle')}
        icon={{ name: 'Sad', variant: 'solid' }}
        testID="cnight-designation-detection-error"
      />
    );
  }

  return (
    <Sheet.Scroll
      showsVerticalScrollIndicator={false}
      contentContainerStyle={scrollContentStyle}>
      <CnightDesignationForm
        isDesignated={isDesignated}
        currentTargetHex={currentTargetHex}
        currentWalletTargetId={currentWalletTargetId}
        targetMode={targetMode}
        onTargetModeChange={setTargetMode}
        walletTargets={walletTargets}
        isWalletTargetAvailable={isWalletTargetAvailable}
        selectedTargetId={selectedTargetId}
        onSelectedTargetIdChange={setSelectedTargetId}
        externalAddress={externalAddress}
        onExternalAddressChange={setExternalAddress}
        externalTargetStatus={externalTargetStatus}
        isSameAsCurrentTarget={isSameAsCurrentTarget}
        isUpdateBlocked={isUpdateBlocked}
        isLocked={isFormLocked}
      />
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  // Fill the full-height sheet (detents [1]) so the loader is centered in the
  // sheet, not floating in a fixed 200px box near the top.
  loadingContainer: {
    flex: 1,
  },
});
