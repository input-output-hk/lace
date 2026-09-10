import { Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { DustDesignationForm } from './DustDesignationForm';
import { DustDesignationReview } from './DustDesignationReview';
import { useDustDesignationSheet } from './useDustDesignationSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DustDesignationSheet = (
  props: SheetScreenProps<SheetRoutes.DustDesignation>,
) => {
  const {
    currentStep,
    dustAddress,
    ownDustAddress,
    nightToken,
    nightTokenTicker,
    dustTokenTicker,
    formattedNightBalance,
    estimatedFee,
    addressError,
    insufficientDustError,
    isFormValid,
    isReviewReady,
    account,
    copies,
    getAddressLabel,
    handleAddressChange,
    handleClose,
    handleDesignate,
    handleBackToForm,
    handleConfirm,
  } = useDustDesignationSheet(props);

  const addressLabel = getAddressLabel(dustAddress);

  const shouldShowFormStep = currentStep === 'form';

  // The form step has no footer; its primary action is the in-body Designate button.
  const designateAction = useMemo(
    () => ({ onPress: handleDesignate, disabled: !isFormValid }),
    [handleDesignate, isFormValid],
  );

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={shouldShowFormStep ? copies.sheetTitle : copies.reviewTitle}
          leftIconOnPress={shouldShowFormStep ? handleClose : handleBackToForm}
          testID="dust-designation-sheet-header"
        />
      ),
      footer: shouldShowFormStep ? undefined : (
        <Sheet.Footer
          primaryButton={{
            label: copies.nextButtonLabel,
            onPress: handleConfirm,
            disabled: !isReviewReady,
            loading: !isReviewReady,
            testID: 'confirm-designation-button',
          }}
        />
      ),
    });
  }, [
    props.navigation,
    shouldShowFormStep,
    copies,
    handleClose,
    handleBackToForm,
    handleConfirm,
    isReviewReady,
  ]);

  return (
    <>
      {shouldShowFormStep ? (
        <Sheet.SubmitProvider action={designateAction}>
          <Sheet.Scroll showsVerticalScrollIndicator={false}>
            <DustDesignationForm
              dustAddress={dustAddress}
              addressLabel={addressLabel}
              addressError={addressError}
              insufficientDustError={insufficientDustError}
              nightToken={nightToken}
              nightTokenTicker={nightTokenTicker}
              dustTokenTicker={dustTokenTicker}
              formattedNightBalance={formattedNightBalance}
              estimatedFee={estimatedFee}
              isFormValid={isFormValid}
              copies={copies}
              onAddressChange={handleAddressChange}
              onDesignate={designateAction.onPress}
            />
          </Sheet.Scroll>
        </Sheet.SubmitProvider>
      ) : (
        <DustDesignationReview
          nightTokenTicker={nightTokenTicker}
          dustTokenTicker={dustTokenTicker}
          formattedNightBalance={formattedNightBalance}
          estimatedFee={estimatedFee}
          dustAddress={dustAddress}
          isOwnAddress={dustAddress === ownDustAddress}
          accountName={account?.metadata?.name || 'Midnight Account'}
          addressLabel={addressLabel}
          copies={copies}
          isReviewReady={isReviewReady}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};
