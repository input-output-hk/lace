import { Sheet, SheetHeader } from '@lace-lib/ui-toolkit';
import React from 'react';

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

  return (
    <>
      <SheetHeader
        title={shouldShowFormStep ? copies.sheetTitle : copies.reviewTitle}
        leftIconOnPress={shouldShowFormStep ? handleClose : handleBackToForm}
        testID="dust-designation-sheet-header"
      />
      {shouldShowFormStep ? (
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
            onDesignate={handleDesignate}
          />
        </Sheet.Scroll>
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
