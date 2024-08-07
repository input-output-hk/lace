/* eslint-disable unicorn/no-null */
import { Wallet } from '@lace/cardano';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { i18n } from '@lace/translation';
import { decryptMessageWithPgp, decryptPgpPrivateKey, readPgpPrivateKey } from '@src/utils/pgp';
import React, { useState, VFC, useEffect, ChangeEvent, useCallback } from 'react';
import { useRestoreWallet } from '../context';
import styles from './EnterPgpPrivateKey.module.scss';
import {
  FileUpload,
  Flex,
  Text,
  ToggleButtonGroup,
  CheckComponent as CheckIcon,
  PasswordBox
} from '@input-output-hk/lace-ui-toolkit';
import { TextArea } from '@lace/common';
import { ShieldedPgpKeyData } from '@src/types';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers';

interface Validation {
  error?: string;
  success?: string;
}

const ASC_FILE_ENDING = /.asc$/;

type PrivateKeyEntry = 'file-upload' | 'clipboard';

export interface DecryptProps {
  pgpInfo: ShieldedPgpKeyData;
}

const decryptQrCodeMnemonicWithPrivateKey = async ({ pgpInfo }: DecryptProps): Promise<string[] | null> => {
  const privateKey = !pgpInfo.privateKeyIsDecrypted
    ? await decryptPgpPrivateKey({
        privateKey: await readPgpPrivateKey({ privateKey: pgpInfo.pgpPrivateKey }),
        passphrase: pgpInfo.pgpKeyPassphrase
      })
    : await readPgpPrivateKey({ privateKey: pgpInfo.pgpPrivateKey });

  const decryptedMessage = await decryptMessageWithPgp({
    message: pgpInfo.shieldedMessage,
    privateKey
  });

  if (
    Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(decryptedMessage.split(' ')))
  ) {
    return decryptedMessage.split(' ');
  }
  return null;
};

export const EnterPgpPrivateKey: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const { back, createWalletData, next, pgpInfo, setPgpInfo, setMnemonic } = useRestoreWallet();
  const [validation, setValidation] = useState<Validation>({ error: null, success: null });
  const [entryType, setEntryType] = useState<PrivateKeyEntry>('file-upload');
  const [privateKeyFile, setPrivateKeyFile] = useState<string>('');

  const handlePgpPrivateKeyBlockChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValidation({ error: null, success: null });
      try {
        const privateKey = await readPgpPrivateKey({ privateKey: e.target.value });
        setPgpInfo({
          ...pgpInfo,
          pgpPrivateKey: e.target.value,
          privateKeyIsDecrypted: privateKey.isDecrypted()
        });
        setValidation({ success: 'valid PGP private key' });
      } catch (error) {
        if (error.message === 'Misformed armored text') {
          setValidation({ error: i18n.t('pgp.error.misformedArmoredText') });
        }
      }
    },
    [setValidation, pgpInfo, setPgpInfo]
  );

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.ENTER_PGP_PRIVATE_KEY_NEXT_CLICK);
    next();
  };

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValidation({ error: null, success: null });
      try {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 1) {
          throw new Error('only 1 file is allowed');
        }
        const [keyFile] = input.files;

        if (keyFile) {
          if (!ASC_FILE_ENDING.test(keyFile.name)) {
            throw new Error('incorrect file type supplied, please use a .asc file');
          }
          const reader = new FileReader();
          reader.addEventListener('load', (event) => {
            const fileinfo = event.target?.result;
            readPgpPrivateKey({ privateKey: fileinfo as string })
              .then((pk) => {
                setPgpInfo({
                  ...pgpInfo,
                  pgpPrivateKey: fileinfo as string,
                  privateKeyIsDecrypted: pk.isDecrypted()
                });
                setValidation({ error: null, success: 'valid PGP private key' });
                setPrivateKeyFile(keyFile?.name);
              })
              .catch((error) => {
                setValidation({ error: error.message });
              });
          });

          reader.addEventListener('error', () => {
            throw new Error('Error reading file');
          });

          reader.readAsText(keyFile);
        }
      } catch (error) {
        setValidation({ error: error.message });
      }
    },
    [setValidation, setPrivateKeyFile, setPgpInfo, pgpInfo]
  );

  useEffect(() => {
    const getMnemonic = async () => {
      try {
        const mnemonic = await decryptQrCodeMnemonicWithPrivateKey({ pgpInfo });
        setValidation({ success: 'mnemonic restored' });
        setMnemonic(mnemonic);
      } catch (error) {
        setValidation({ error: error.message });
      }
    };
    if (
      ((pgpInfo.pgpPrivateKey && pgpInfo.privateKeyIsDecrypted) ||
        (pgpInfo.pgpPrivateKey && pgpInfo.pgpKeyPassphrase && !pgpInfo.privateKeyIsDecrypted)) && // Only try to decrypt if we don't already have a wallet
      !createWalletData.mnemonic.every((w) => !!w)
    )
      getMnemonic();
  }, [pgpInfo, createWalletData.mnemonic, setMnemonic, setValidation]);

  useEffect(() => {
    setValidation({ error: null });
  }, [entryType]);

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.enterPgpPrivateKey.title')}
        description={i18n.t('paperWallet.enterPgpPrivateKey.description')}
        onBack={back}
        onNext={handleNext}
        isNextEnabled={!!createWalletData.mnemonic.every((w) => !!w)}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      >
        <Flex gap="$8" flexDirection="column" w="$fill">
          <Flex w="$fill">
            <ToggleButtonGroup.Root
              onValueChange={(changedEntryType: 'file-upload' | 'clipboard') => {
                setEntryType(changedEntryType);
                setPrivateKeyFile('');
                setPgpInfo({
                  shieldedMessage: pgpInfo.shieldedMessage,
                  privateKeyIsDecrypted: true,
                  pgpPrivateKey: null,
                  pgpKeyPassphrase: null
                });
              }}
              value={entryType}
            >
              <ToggleButtonGroup.Item value="file-upload">
                {i18n.t('paperWallet.enterPgpPrivateKey.toggleOption.fileUpload')}
              </ToggleButtonGroup.Item>
              <ToggleButtonGroup.Item value="clipboard">
                {i18n.t('paperWallet.enterPgpPrivateKey.toggleOption.fromClipboard')}
              </ToggleButtonGroup.Item>
            </ToggleButtonGroup.Root>
          </Flex>
          <Flex flexDirection="column" w="$fill" h="$fill" gap="$8" className={styles.privateKeyEntryMethod}>
            {entryType === 'file-upload' ? (
              <FileUpload
                id="pgp-private-key-upload"
                label={i18n.t('paperWallet.enterPgpPrivateKey.fileUploadLabel')}
                removeButtonLabel="" // not used
                supportedFormats={i18n.t('paperWallet.enterPgpPrivateKey.supportedFileUploadFormats')}
                onChange={handleFileChange}
                files={!!privateKeyFile && [privateKeyFile]}
                style={{
                  maxHeight: 136
                }}
                onSubmit={null}
              />
            ) : (
              <TextArea
                label={i18n.t('core.paperWallet.privatePgpKeyLabel')}
                onChange={handlePgpPrivateKeyBlockChange}
                dataTestId="pgp-key-block"
                isResizable={false}
                className={styles.textArea}
              />
            )}
            <PasswordBox
              onChange={(e) => {
                setPgpInfo({ ...pgpInfo, pgpKeyPassphrase: e.target.value });
              }}
              label={i18n.t('core.paperWallet.privatePgpKeyPassphraseLabel')}
              value={pgpInfo.pgpKeyPassphrase || ''}
              onSubmit={null}
              disabled={pgpInfo.privateKeyIsDecrypted}
              data-testid="pgp-passphrase"
            />
            <Flex className={styles.validationContainer}>
              {validation.error && <Text.Label color="error">{validation.error}</Text.Label>}
              {validation.success && (
                <Flex gap="$4">
                  <CheckIcon />
                  <Text.Label color="secondary">{validation.success}</Text.Label>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
