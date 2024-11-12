import { FileUpload, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import React, { ChangeEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SharedWalletTransactionSchema } from '../../docs/schema/shared-wallet-transaction-type-autogenerated';
import { ErrorDialog, ErrorKind } from './ErrorDialog';

export class UnrecognizedFile extends Error {
  constructor() {
    super('UnrecognizedFile');
  }
}

const loadFileAsJson = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.error) {
        reject(new UnrecognizedFile());
        return;
      }
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new UnrecognizedFile());
      }
    });
    reader.readAsText(file);
  });

type CoSignEntryProps = {
  onCancel: () => void;
  onContinue: (txData: SharedWalletTransactionSchema) => void;
  onImportError?: () => void;
};

export const CoSignEntry = ({ onCancel, onContinue, onImportError }: CoSignEntryProps) => {
  const { t } = useTranslation();
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>('');

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files?.length === 0) return;
    setLoadedFileName(event.target.files[0].name);

    let loadedData: unknown;
    try {
      loadedData = await loadFileAsJson(event.target.files[0]);
    } catch (error: unknown) {
      onImportError?.();
      if (error instanceof UnrecognizedFile) {
        setErrorKind(ErrorKind.InvalidFile);
        return;
      }
      throw error;
    }

    // TODO: validate loaded data against schema
    if (typeof loadedData !== 'object' || !(loadedData && 'transaction' in loadedData) || !('metadata' in loadedData)) {
      onImportError?.();
      setErrorKind(ErrorKind.InvalidFile);
    }

    onContinue(loadedData as SharedWalletTransactionSchema);
  };

  const onErrorCancel = () => {
    if (errorKind !== ErrorKind.InvalidFile) return;
    onCancel();
  };

  const onErrorConfirm = () => {
    switch (errorKind) {
      case ErrorKind.InvalidFile: {
        setErrorKind(null);
        setLoadedFileName(null);
        break;
      }

      case ErrorKind.InvalidActiveWallet:
      case ErrorKind.TxAlreadySigned:
      case ErrorKind.TxExpired:
      case ErrorKind.InsufficientFunds:
      default: {
        onCancel();
        break;
      }
    }
  };

  return (
    <>
      <Flex gap="$32" flexDirection="column" h="$fill">
        <Flex gap="$8" flexDirection="column">
          <Text.SubHeading>Import transaction</Text.SubHeading>
          <Text.Body.Normal>
            To co-sign a transaction initiated by another shared wallet member, upload the transaction JSON file you
            received.
          </Text.Body.Normal>
        </Flex>
        <Flex h="$fill" w="$fill">
          <FileUpload
            id="upload-transaction-json"
            label={
              <Trans
                i18nKey="sharedWallets.transaction.coSign.importJsonStep.uploadBtnTitle"
                t={t}
                components={{
                  Link: <Text.Button color="highlight" />,
                }}
              />
            }
            accept="application/json"
            onChange={onFileChange}
            supportedFormats="Supported formats: JSON"
            removeButtonLabel="Remove"
            files={loadedFileName ? [loadedFileName] : undefined}
            onRemove={() => setLoadedFileName('')}
          />
        </Flex>
      </Flex>
      {errorKind && <ErrorDialog errorKind={errorKind} onCancel={onErrorCancel} onConfirm={onErrorConfirm} />}
    </>
  );
};
