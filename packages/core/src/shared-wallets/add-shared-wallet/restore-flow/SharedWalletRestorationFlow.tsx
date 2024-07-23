/* eslint-disable unicorn/no-useless-undefined */
import { Dialog, FileUpload, Text } from '@input-output-hk/lace-ui-toolkit';
import React, { VFC, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../SharedWalletLayout';
import { restorationTimelineSteps } from './timelineSteps';
import { CreateWalletParams, FileErrorMessage, FileValidationError, SharedWalletRestorationStep } from './types';
import { validateJson } from './validateJson';

type SharedWalletRestorationProps = {
  exitTheFlow: () => void;
  navigateToAppHome: () => void;
  onRestoreSharedWallet: (data: CreateWalletParams) => void;
  sharedKeys: string;
};

const UPLOAD_JSON_ID = 'upload-json';

export const SharedWalletRestorationFlow: VFC<SharedWalletRestorationProps> = ({
  sharedKeys,
  exitTheFlow,
  navigateToAppHome,
  onRestoreSharedWallet,
}) => {
  const [file, setFile] = useState<File | undefined>();
  const [cosignerData, setCosignerData] = useState<CreateWalletParams | undefined>(undefined);
  const [error, setError] = useState<FileValidationError | undefined>();

  const { t } = useTranslation();

  const translations = {
    incorrectWalletError: {
      description: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.exit'),
      title: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.title'),
    },
    next: t('sharedWallets.addSharedWallet.import.next'),
    subtitle: t('sharedWallets.addSharedWallet.import.subtitle'),
    title: t('sharedWallets.addSharedWallet.import.title'),
    unrecognizedError: {
      description: t('sharedWallets.addSharedWallet.import.error.unrecognized.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.unrecognized.exit'),
      retry: t('sharedWallets.addSharedWallet.import.error.unrecognized.retry'),
      title: t('sharedWallets.addSharedWallet.import.error.unrecognized.title'),
    },
    uploadBtnFormats: t('sharedWallets.addSharedWallet.import.uploadBtnFormats'),
    uploadBtnRemove: t('sharedWallets.addSharedWallet.import.uploadBtnRemove'),
    uploadBtnTitle: (
      <Trans
        i18nKey="sharedWallets.addSharedWallet.import.uploadBtnTitle"
        t={t}
        components={{
          Link: <Text.Button color="highlight" />,
        }}
      />
    ),
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  const onContinue = () => {
    try {
      onRestoreSharedWallet(cosignerData);
      navigateToAppHome();
    } catch (error_) {
      console.error(error_);
    }
  };

  useEffect(() => {
    setError(undefined);
    const validate = async (importedFile: File) => {
      try {
        const result = await validateJson(importedFile, sharedKeys);
        // TODO: LW-11018 wallet already exist should be blocked before this line executes (it must have an error registered)
        if (result.data) {
          setCosignerData(result.data);
        }
      } catch (error_: unknown) {
        setError(error_ as FileValidationError);
      }
    };

    if (file) {
      validate(file);
    }
  }, [file, sharedKeys]);

  return (
    <>
      <SharedWalletLayout
        title={translations.title}
        description={translations.subtitle}
        onBack={exitTheFlow}
        onNext={onContinue}
        isNextEnabled={!!file && !!cosignerData}
        customNextLabel={translations.next}
        timelineSteps={restorationTimelineSteps}
        timelineCurrentStep={SharedWalletRestorationStep.Import}
      >
        <FileUpload
          id={UPLOAD_JSON_ID}
          label={translations.uploadBtnTitle}
          accept="application/json"
          onChange={handleFileChange}
          supportedFormats={translations.uploadBtnFormats}
          removeButtonLabel={translations.uploadBtnRemove}
          files={file ? [file.name] : undefined}
          onRemove={() => setFile(undefined)}
          key={file ? file.name : ''}
        />
      </SharedWalletLayout>
      <Dialog.Root open={error?.message === FileErrorMessage.UNRECOGNIZED} zIndex={1000} setOpen={() => void 0}>
        <Dialog.Title>{translations.unrecognizedError.title}</Dialog.Title>
        <Dialog.Description>{translations.unrecognizedError.description}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            cancel
            label={translations.unrecognizedError.exit}
            onClick={() => setFile(undefined)}
            testId="error-unrecognized-exit-btn"
          />
          <Dialog.Action
            autoFocus
            label={translations.unrecognizedError.retry}
            onClick={() => document.getElementById(UPLOAD_JSON_ID)?.click()}
            testId="error-unrecognized-retry-btn"
          />
        </Dialog.Actions>
      </Dialog.Root>
      <Dialog.Root open={error?.message === FileErrorMessage.INVALID_KEY} zIndex={1000} setOpen={() => void 0}>
        <Dialog.Title>{translations.incorrectWalletError.title}</Dialog.Title>
        <Dialog.Description>{translations.incorrectWalletError.description}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            autoFocus
            label={translations.incorrectWalletError.exit}
            onClick={navigateToAppHome}
            testId="error-invalid-shared-wallet-key-exit-btn"
          />
        </Dialog.Actions>
      </Dialog.Root>
    </>
  );
};
