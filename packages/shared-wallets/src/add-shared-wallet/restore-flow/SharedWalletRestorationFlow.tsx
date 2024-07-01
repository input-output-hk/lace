import { Dialog, FileUpload, Text } from '@lace/ui';
import { SharedWalletLayout } from '../SharedWalletLayout';
import { VFC, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FileErrorMessage, FileValidationError, SharedWalletRestorationStep } from './types';
import { validateJson } from './validateJson';
import { restorationTimelineSteps } from './timelineSteps';

type SharedWalletRestorationProps = {
  navigateToAppHome: () => void;
  navigateToStart: () => void;
};

const UPLOAD_JSON_ID = 'upload-json';

export const SharedWalletRestorationFlow: VFC<SharedWalletRestorationProps> = ({ 
  navigateToStart,
  navigateToAppHome
}) => {
  const [file, setFile] = useState<File | undefined>();
  const [isFileValid, setFileValid] = useState(false);
  const [error, setError] = useState<FileValidationError | undefined>();

  const { t } = useTranslation();

  const translations = {
    next: t('sharedWallets.addSharedWallet.import.next'),
    subtitle: t('sharedWallets.addSharedWallet.import.subtitle'),
    title: t('sharedWallets.addSharedWallet.import.title'),
    uploadBtnTitle: (
      <Trans
        i18nKey="sharedWallets.addSharedWallet.import.uploadBtnTitle"
        t={t}
        components={{
          Link: (
            <Text.Button color="highlight" />
          )
        }}
      />
    ),
    uploadBtnFormats: t('sharedWallets.addSharedWallet.import.uploadBtnFormats'),
    uploadBtnRemove: t('sharedWallets.addSharedWallet.import.uploadBtnRemove'),
    unrecognizedError: {
      title: t('sharedWallets.addSharedWallet.import.error.unrecognized.title'),
      description: t('sharedWallets.addSharedWallet.import.error.unrecognized.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.unrecognized.exit'),
      retry: t('sharedWallets.addSharedWallet.import.error.unrecognized.retry')
    },
    incorrectWalletError: {
      title: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.title'),
      description: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.exit')
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  useEffect(() => {
    setError(undefined);
    const validate = async (importedFile: File) => {
      try {
        const result = await validateJson(importedFile);
        setFileValid(result.isFileValid);
      } catch (e: unknown) {
        setError(e as FileValidationError);
      }
    };

    if (file) {
      validate(file);
    }
  }, [file]);

  return (
    <>
      <SharedWalletLayout
        title={translations.title}
        description={translations.subtitle}
        onBack={navigateToStart}
        onNext={navigateToAppHome}
        isNextEnabled={!!file && isFileValid}
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
      <Dialog.Root open={error?.message === FileErrorMessage.INVALID_KEYS} zIndex={1000} setOpen={() => void 0}>
        <Dialog.Title>{translations.incorrectWalletError.title}</Dialog.Title>
        <Dialog.Description>{translations.incorrectWalletError.description}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            autoFocus
            label={translations.incorrectWalletError.exit}
            onClick={navigateToAppHome}
            testId="error-invalid-keys-exit-btn"
          />
        </Dialog.Actions>
      </Dialog.Root>
    </>
  );
};
