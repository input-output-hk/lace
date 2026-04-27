import type { ReactNode } from 'react';

import { AuthSecret } from '@lace-contract/authentication-prompt';
import { Trans, useTranslation } from '@lace-contract/i18n';
import {
  Text,
  Button,
  Column,
  CustomTextInput,
  Icon,
  OnboardingLayout,
  isExtensionSidePanel,
  spacing,
  useTheme,
  Brand,
  Row,
  assets,
} from '@lace-lib/ui-toolkit';
import { ByteArray } from '@lace-sdk/util';
import { ImageBackground } from 'expo-image';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
} from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks/lace-context';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { connectSetupAuthenticationChannel } from '../setup-authentication-channel';
import {
  reEncryptWalletSecrets,
  tryDecrypt,
  verifyAllSecretsDecryptable,
} from '../store/reencrypt';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InMemoryWallet, WalletId } from '@lace-contract/wallet-repo';
import type { Theme } from '@lace-lib/ui-toolkit';

const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

interface SetApplicationPasswordScreenProps {
  onPasswordSet: (passwordBytes: Uint8Array) => Promise<void> | void;
}

const SetApplicationPasswordScreen = ({
  onPasswordSet,
}: SetApplicationPasswordScreenProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getSetPasswordStyles(theme);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const toggleNewPasswordVisibility = useCallback(() => {
    setIsNewPasswordVisible(previous => !previous);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setIsConfirmPasswordVisible(previous => !previous);
  }, []);

  const { feedback: passwordStrengthFeedback, isStrong: isPasswordStrong } =
    usePasswordStrength(newPassword);

  const isPasswordMatch = useMemo(
    () => newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );

  const inputError = useMemo((): string | undefined => {
    if (!newPassword || !confirmPassword) return undefined;
    if (!isPasswordMatch) {
      return t('migrate-v1.password-migration.set-password.passwords-mismatch');
    }
    return undefined;
  }, [newPassword, confirmPassword, isPasswordMatch, t]);

  const isNextDisabled = useMemo(() => {
    if (!newPassword || !confirmPassword) return true;
    if (!isPasswordMatch) return true;
    return !isPasswordStrong;
  }, [newPassword, confirmPassword, isPasswordMatch, isPasswordStrong]);

  const handleSubmit = useCallback(() => {
    if (isNextDisabled) return;
    const passwordBytes = ByteArray.fromUTF8(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    void onPasswordSet(passwordBytes);
  }, [isNextDisabled, newPassword, onPasswordSet]);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={handleDismissKeyboard}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text.Header testID="migrate-v1-set-password-title" align="center">
              {t('migrate-v1.password-migration.set-password.title')}
            </Text.Header>
            <Text.M
              testID="migrate-v1-set-password-description"
              variant="secondary"
              align="center">
              {t('migrate-v1.password-migration.set-password.description')}
            </Text.M>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text.S variant="primary" testID="migrate-v1-new-password-label">
                {t(
                  'migrate-v1.password-migration.set-password.new-password-label',
                )}
              </Text.S>
              <CustomTextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isNewPasswordVisible}
                testID="migrate-v1-new-password-input"
                postButton={{
                  icon: (
                    <Icon name={isNewPasswordVisible ? 'View' : 'ViewOff'} />
                  ),
                  onPress: toggleNewPasswordVisibility,
                  testID: 'migrate-v1-new-password-visibility-toggle',
                }}
              />
              <Text.XS
                style={[
                  styles.hintText,
                  !passwordStrengthFeedback && styles.invisibleText,
                ]}
                testID="migrate-v1-password-strength-feedback">
                {passwordStrengthFeedback || ' '}
              </Text.XS>
            </View>

            <View style={styles.inputGroup}>
              <Text.S
                variant="primary"
                testID="migrate-v1-confirm-password-label">
                {t(
                  'migrate-v1.password-migration.set-password.confirm-password-label',
                )}
              </Text.S>
              <CustomTextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                testID="migrate-v1-confirm-password-input"
                inputError={inputError}
                postButton={{
                  icon: (
                    <Icon
                      name={isConfirmPasswordVisible ? 'View' : 'ViewOff'}
                    />
                  ),
                  onPress: toggleConfirmPasswordVisibility,
                  testID: 'migrate-v1-confirm-password-visibility-toggle',
                }}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button.Primary
              label={t('migrate-v1.password-migration.set-password.submit')}
              onPress={handleSubmit}
              disabled={isNextDisabled}
              testID="migrate-v1-set-password-submit"
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const getSetPasswordStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.L,
      paddingBottom: spacing.L,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      gap: spacing.M,
      paddingTop: spacing.XL,
    },
    form: {
      gap: spacing.M,
    },
    inputGroup: {
      gap: spacing.S,
    },
    hintText: {
      color: theme.text.tertiary,
      paddingHorizontal: spacing.S,
    },
    invisibleText: {
      opacity: 0,
    },
    buttonContainer: {
      paddingTop: spacing.M,
    },
  });

interface ActivateWalletScreenProps {
  walletId: WalletId;
  currentIndex: number;
  totalCount: number;
  getAppPassword: () => Uint8Array | null;
}

const ActivateWalletScreen = ({
  walletId,
  currentIndex,
  totalCount,
  getAppPassword,
}: ActivateWalletScreenProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getActivateWalletStyles(theme);

  const [legacyPassword, setLegacyPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSkipConfirmationVisible, setIsSkipConfirmationVisible] =
    useState(false);

  const wallet = useLaceSelector('wallets.selectWalletById', walletId);
  const dispatchWalletActivated = useDispatchLaceAction(
    'migrateV1.walletActivated',
  );
  const dispatchWalletDeleted = useDispatchLaceAction(
    'migrateV1.walletDeleted',
  );
  const dispatchUpdateWallet = useDispatchLaceAction('wallets.updateWallet');

  useEffect(() => {
    setLegacyPassword('');
    setIsPasswordVisible(false);
    setIsActivating(false);
    setErrorMessage(undefined);
    setIsSkipConfirmationVisible(false);
  }, [walletId]);

  const walletName = useMemo(
    () => wallet?.metadata?.name ?? walletId,
    [wallet, walletId],
  );

  const progressText = useMemo(
    () =>
      t('migrate-v1.password-migration.activate-wallet.progress', {
        current: String(currentIndex + 1),
        total: String(totalCount),
      }),
    [t, currentIndex, totalCount],
  );

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(previous => !previous);
  }, []);

  const handleActivate = useCallback(async () => {
    if (!legacyPassword || isActivating || !wallet) return;
    setIsActivating(true);
    setErrorMessage(undefined);

    const passwordBytes = ByteArray.fromUTF8(legacyPassword);
    const inMemoryWallet = wallet as InMemoryWallet;
    const newAppPassword = getAppPassword();

    if (!newAppPassword) {
      setIsActivating(false);
      setErrorMessage('App password not set');
      passwordBytes.fill(0);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const canDecrypt = await tryDecrypt(
        inMemoryWallet.encryptedRecoveryPhrase,
        passwordBytes,
      );

      if (!canDecrypt) {
        setIsActivating(false);
        setErrorMessage(
          t('migrate-v1.password-migration.activate-wallet.wrong-password'),
        );
        setLegacyPassword('');
        return;
      }

      const reEncryptedData = await reEncryptWalletSecrets(
        inMemoryWallet,
        passwordBytes,
        newAppPassword,
      );

      dispatchUpdateWallet({ id: walletId, changes: reEncryptedData });
      dispatchWalletActivated(walletId);

      setLegacyPassword('');
      setIsActivating(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        'migrate-v1-data: re-encryption failed for wallet',
        walletId,
        error,
      );
      setIsActivating(false);
      setErrorMessage(
        t('migrate-v1.password-migration.activate-wallet.reencrypt-failed'),
      );
      setLegacyPassword('');
    } finally {
      passwordBytes.fill(0);
    }
  }, [
    legacyPassword,
    isActivating,
    wallet,
    walletId,
    walletName,
    getAppPassword,
    dispatchUpdateWallet,
    dispatchWalletActivated,
    t,
  ]);

  const handleSkipPress = useCallback(() => {
    setIsSkipConfirmationVisible(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    setIsSkipConfirmationVisible(false);
    dispatchWalletDeleted(walletId);
  }, [walletId, dispatchWalletDeleted]);

  const handleDeleteCancel = useCallback(() => {
    setIsSkipConfirmationVisible(false);
  }, []);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const isActivateDisabled = useMemo(
    () => !legacyPassword || isActivating,
    [legacyPassword, isActivating],
  );

  if (isActivating) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text.Header testID="migrate-v1-activating" align="center">
            {t('migrate-v1.password-migration.activate-wallet.activating', {
              walletName,
            })}
          </Text.Header>
          <Text.M variant="secondary" align="center">
            {t('migrate-v1.password-migration.activate-wallet.activating-hint')}
          </Text.M>
        </View>
      </View>
    );
  }

  if (isSkipConfirmationVisible) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text.Header testID="migrate-v1-delete-confirm-title" align="center">
            {t(
              'migrate-v1.password-migration.activate-wallet.skip-confirmation-title',
            )}
          </Text.Header>
        </View>
        <Column style={{ flex: 1 }} justifyContent="center" alignItems="center">
          <Text.M
            testID="migrate-v1-delete-confirm-description"
            variant="secondary"
            align="center">
            {t(
              'migrate-v1.password-migration.activate-wallet.skip-confirmation',
              { walletName },
            )}
          </Text.M>
        </Column>
        <View style={styles.deleteButtonsContainer}>
          <View style={styles.buttonFlex}>
            <Button.Secondary
              label={t('app.cancel')}
              onPress={handleDeleteCancel}
              testID="migrate-v1-delete-cancel"
            />
          </View>
          <View style={styles.buttonFlex}>
            <Button.Critical
              label={t(
                'migrate-v1.password-migration.activate-wallet.skip-button',
              )}
              onPress={handleSkipConfirm}
              testID="migrate-v1-skip-confirm"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={handleDismissKeyboard}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text.XS variant="tertiary" testID="migrate-v1-activate-progress">
              {progressText}
            </Text.XS>
            <Text.Header testID="migrate-v1-activate-title" align="center">
              {t('migrate-v1.password-migration.activate-wallet.title')}
            </Text.Header>
            <Text.M
              testID="migrate-v1-activate-description"
              variant="secondary"
              align="center">
              {t('migrate-v1.password-migration.activate-wallet.description', {
                walletName,
              })}
            </Text.M>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text.S
                variant="primary"
                testID="migrate-v1-legacy-password-label">
                {t(
                  'migrate-v1.password-migration.activate-wallet.password-label',
                )}
              </Text.S>
              <CustomTextInput
                value={legacyPassword}
                onChangeText={setLegacyPassword}
                secureTextEntry={!isPasswordVisible}
                testID="migrate-v1-legacy-password-input"
                inputError={errorMessage}
                postButton={{
                  icon: <Icon name={isPasswordVisible ? 'View' : 'ViewOff'} />,
                  onPress: togglePasswordVisibility,
                  testID: 'migrate-v1-legacy-password-visibility-toggle',
                }}
              />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <View style={styles.buttonFlex}>
              <Button.Secondary
                label={t(
                  'migrate-v1.password-migration.activate-wallet.skip-button',
                )}
                onPress={handleSkipPress}
                testID="migrate-v1-skip-wallet"
              />
            </View>
            <View style={styles.buttonFlex}>
              <Button.Primary
                label={t(
                  'migrate-v1.password-migration.activate-wallet.activate-button',
                )}
                onPress={() => void handleActivate()}
                disabled={isActivateDisabled}
                loading={isActivating}
                testID="migrate-v1-activate-wallet"
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const getActivateWalletStyles = (_theme: Theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.L,
      paddingBottom: spacing.L,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      gap: spacing.M,
      paddingTop: spacing.XL,
    },
    form: {
      gap: spacing.M,
    },
    inputGroup: {
      gap: spacing.S,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: spacing.M,
      paddingTop: spacing.M,
    },
    deleteButtonsContainer: {
      flexDirection: 'row',
      gap: spacing.M,
      paddingTop: spacing.M,
    },
    buttonFlex: {
      flex: 1,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.M,
      paddingHorizontal: spacing.L,
    },
  });

const { setup: setupAuthentication } = connectSetupAuthenticationChannel({
  logger: console,
});

const PasswordMigrationWizard = () => {
  const { t } = useTranslation();
  const { theme, setTemporaryThemeChoice, clearTemporaryTheme } = useTheme();
  const styles = getOverlayStyles(theme);
  const [isReady, setIsReady] = useState(false);

  const status = useLaceSelector('migrateV1.selectPasswordMigrationStatus');
  const pendingWallets = useLaceSelector(
    'migrateV1.selectWalletsPendingActivation',
  );
  const initialWalletCount = useLaceSelector(
    'migrateV1.selectInitialWalletCount',
  );
  const allWallets = useLaceSelector('wallets.selectAll');

  const dispatchApplicationPasswordSet = useDispatchLaceAction(
    'migrateV1.applicationPasswordSet',
  );
  const dispatchPasswordMigrationCompleted = useDispatchLaceAction(
    'migrateV1.passwordMigrationCompleted',
  );
  const dispatchWalletActivated = useDispatchLaceAction(
    'migrateV1.walletActivated',
  );
  const dispatchWizardMounted = useDispatchLaceAction(
    'migrateV1.wizardMounted',
  );

  const appPasswordRef = useRef<Uint8Array | null>(null);

  const wizardMountedDispatchedRef = useRef(false);
  useEffect(() => {
    if (
      (status === 'pending' || status === 'activating') &&
      !isExtensionSidePanel &&
      !wizardMountedDispatchedRef.current
    ) {
      wizardMountedDispatchedRef.current = true;
      dispatchWizardMounted();
    }
  }, [status, dispatchWizardMounted]);

  useEffect(() => {
    if (status === 'completed') {
      appPasswordRef.current?.fill(0);
      appPasswordRef.current = null;
    }
  }, [status]);

  useEffect(
    () => () => {
      appPasswordRef.current?.fill(0);
      appPasswordRef.current = null;
    },
    [],
  );

  const currentIndex = useMemo(
    () => initialWalletCount - pendingWallets.length,
    [initialWalletCount, pendingWallets.length],
  );

  const getAppPassword = useCallback(() => appPasswordRef.current, []);

  const handlePasswordSet = useCallback(
    async (password: Uint8Array) => {
      appPasswordRef.current = password;

      const isSuccess = await setupAuthentication(
        AuthSecret(ByteArray(password)),
      );
      if (!isSuccess) return;

      const matches = await Promise.all(
        pendingWallets.map(async (wId: WalletId) => {
          const w = allWallets.find(
            (wal: { walletId: WalletId }) => wal.walletId === wId,
          ) as InMemoryWallet | undefined;
          if (!w) return null;
          const isMatch = await verifyAllSecretsDecryptable(w, password);
          return isMatch ? wId : null;
        }),
      );

      if (pendingWallets.length === 0) {
        dispatchPasswordMigrationCompleted();
      } else {
        dispatchApplicationPasswordSet();

        for (const matchedId of matches) {
          if (matchedId) dispatchWalletActivated(matchedId);
        }
      }
    },
    [
      pendingWallets,
      allWallets,
      dispatchApplicationPasswordSet,
      dispatchPasswordMigrationCompleted,
      dispatchWalletActivated,
    ],
  );

  useEffect(() => {
    if (status === 'pending' && !isReady) {
      setTemporaryThemeChoice('dark');
    } else {
      clearTemporaryTheme();
    }

    return () => {
      clearTemporaryTheme();
    };
  }, [status, isReady]);

  if (status === 'not-required' || status === 'completed') {
    return null;
  }

  return (
    <View style={styles.overlay} testID="migrate-v1-password-wizard">
      <OnboardingLayout>
        {status === 'pending' && !isReady && (
          <Column
            style={{
              flex: 1,
              padding: spacing.L,
            }}>
            <ImageBackground
              source={assets.onboarding}
              style={{ ...StyleSheet.absoluteFillObject }}
              contentFit="cover"
            />
            <Column
              style={{ flex: 1 }}
              justifyContent="center"
              alignItems="flex-start"
              gap={spacing.M}>
              <Text.L
                variant="tertiary"
                testID="migrate-v1-not-started-title"
                style={{ color: theme.brand.white, marginBottom: spacing.M }}>
                {t('migrate-v1.password-migration.activate-wallet.welcome-to')}
              </Text.L>
              <Row alignItems="flex-end" gap={spacing.S}>
                <Brand />
                <Text.M
                  weight="bold"
                  testID="migrate-v1-not-started-title"
                  align="center"
                  style={{
                    color: theme.brand.white,
                    marginBottom: spacing.S,
                  }}>
                  {t('migrate-v1.password-migration.activate-wallet.v2')}
                </Text.M>
              </Row>
              <Row>
                <Trans
                  i18nKey={
                    'migrate-v1.password-migration.activate-wallet.ready-to-go-description'
                  }
                  components={{
                    Text: <Text.L variant="tertiary" key="description" />,
                    Upgraded: <Text.L weight="bold" key="bold" />,
                    Faster: <Text.L weight="bold" key="bold" />,
                    Smarter: <Text.L weight="bold" key="bold" />,
                    MultiChain: <Text.L weight="bold" key="bold" />,
                  }}
                />
              </Row>
            </Column>
            <Button.Primary
              label={t(
                'migrate-v1.password-migration.activate-wallet.ready-to-go',
              )}
              onPress={() => {
                setIsReady(true);
              }}
              testID="migrate-v1-not-started-button"
            />
          </Column>
        )}
        {status === 'pending' && isReady && (
          <SetApplicationPasswordScreen onPasswordSet={handlePasswordSet} />
        )}
        {status === 'activating' && pendingWallets.length > 0 && (
          <ActivateWalletScreen
            walletId={pendingWallets[0]}
            currentIndex={currentIndex}
            totalCount={initialWalletCount}
            getAppPassword={getAppPassword}
          />
        )}
      </OnboardingLayout>
    </View>
  );
};

const OVERLAY_Z_INDEX = 9999;
const getOverlayStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...({ position: 'fixed' } as unknown as ViewStyle),
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background.page,
      zIndex: OVERLAY_Z_INDEX,
    },
  });

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = () => <PasswordMigrationWizard key="password-migration-wizard" />;

export default loadGlobalOverlays;
