/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect, useRef, VFC, useCallback } from 'react';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { useRestoreWallet } from '../context';
import { Wallet } from '@lace/cardano';
import {
  Box,
  Flex,
  Select,
  Button,
  Text,
  SadEmojiComponent as SadEmojiIcon,
  CameraComponent as CameraIcon,
  WarningIconCircleComponent as WarningIcon
} from '@input-output-hk/lace-ui-toolkit';
import { i18n } from '@lace/translation';
import jsQR, { QRCode } from 'jsqr';
import { Trans } from 'react-i18next';
import styles from './ScanShieldedMessage.module.scss';
import cn from 'classnames';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { Loader, logger } from '@lace/common';

interface Validation {
  error?: {
    title: string;
    description: string;
  };
}

const VALIDATION_TIMEOUT_MS = 2000;

const stripDetailFromVideoDeviceName = (str: string) => str.replace(/\s(camera\s?)\(?.*\)?$/i, '');

type QrCodeScanState = 'waiting' | 'blocked' | 'scanning' | 'validating' | 'scanned';
interface ByteChunk<T> {
  bytes: Uint8Array;
  text?: T;
  type: 'byte';
}

type ScannedCode = [ByteChunk<null>, ByteChunk<string>, ByteChunk<Wallet.ChainName>];

export const ScanShieldedMessage: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const { back, next, pgpInfo, setPgpInfo, setWalletMetadata } = useRestoreWallet();
  const [validation, setValidation] = useState<Validation>({ error: null });
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [scanState, setScanState] = useState<QrCodeScanState>('waiting');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream>(null);
  const [deviceId, setDeviceId] = useState<MediaDeviceInfo['deviceId'] | null>();

  const endVideoTracks = () => {
    streamRef.current.getVideoTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleDeviceChange = async (value: MediaDeviceInfo['deviceId']) => {
    endVideoTracks();
    setDeviceId(value);
  };

  const VideoDeviceSelectOptions = useMemo(
    () =>
      videoDevices.map(({ label, deviceId: videoDeviceId }) => (
        <Select.Item key={videoDeviceId} title={stripDetailFromVideoDeviceName(label)} value={videoDeviceId} />
      )),
    [videoDevices]
  );

  const flipVideoScaleX = useMemo(
    () => videoDevices?.findIndex((videoDevice) => videoDevice.deviceId === deviceId) === 0,
    [videoDevices, deviceId]
  );

  useEffect(() => {
    if (videoDevices.length > 0) setDeviceId(videoDevices[0].deviceId);
  }, [videoDevices]);

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        setScanState('scanning');
        void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_CAMERA_OK);
      } catch (error) {
        // Map error messages
        if (error.message === 'Permission denied' || error.name === 'NotAllowedError') {
          setScanState('blocked');
          void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_CAMERA_ERROR);
        }
      }
    };
    setScanState('waiting');
    getVideoStream();
  }, [
    deviceId,
    analytics,
    setScanState,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_OK,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_ERROR
  ]);

  const onScanSuccess = async (message: Uint8Array, address: string, chain: Wallet.ChainName) => {
    setPgpInfo({ ...pgpInfo, shieldedMessage: message });
    setWalletMetadata({ chain, address });
    setValidation({ error: null });
    endVideoTracks();
    await analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_READ_SUCCESS);
  };

  useEffect(() => {
    void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_PAGEVIEW);
  }, [analytics, postHogActions.restore.SCAN_QR_CODE_PAGEVIEW]);

  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const localVideoDevices = allDevices.filter((device) => device.kind === 'videoinput');
        setVideoDevices(localVideoDevices);
      } catch (error) {
        logger.error('Error enumerating devices:', error);
      }
    };
    enumerateDevices();
  }, []);

  const onScanCode = useCallback(
    async (code: QRCode) => {
      const [shieldedMessage, address, chain] = code.chunks as ScannedCode;

      const shieldedQrCodeDataFormat = new RegExp(/^addr.*(Preprod|Preview|Mainnet)$/);
      const isCodeDataCorrectFormatForPaperWallet = shieldedQrCodeDataFormat.test(code.data);
      // User may have scanned the wallet address QR code
      if (Wallet.Cardano.Address.fromString(code.data)) {
        setValidation({
          error: { title: 'Wrong QR code identified', description: 'Scan paper wallet private QR code' }
        });
        void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_READ_ERROR);
      } else if (isCodeDataCorrectFormatForPaperWallet) {
        if (!shieldedMessage?.bytes || !address?.text || !chain?.text) return; // wait for code to be scanned in it's entirety
        await onScanSuccess(shieldedMessage.bytes, address.text, chain.text);
        next();
        // Immediately move to next step
      } else {
        setValidation({ error: { title: 'Unidentified QR code', description: 'Scan your Lace paper wallet' } });
        await analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_READ_ERROR);
      }
      setScanState('scanning');
    },
    [next, setValidation, setScanState, onScanSuccess, analytics, postHogActions.restore.SCAN_QR_CODE_READ_ERROR]
  );

  useEffect(() => {
    const scanQRCode = async () => {
      if (!videoRef?.current?.srcObject || !canvasRef.current) {
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (canvas.width === 0 || canvas.height === 0) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setScanState('validating');
        onScanCode(code);
      }
      requestAnimationFrame(scanQRCode);
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        requestAnimationFrame(scanQRCode);
      });
    }
  }, [
    setScanState,
    onScanCode,
    analytics,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_ERROR,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_OK
  ]);

  useEffect(() => {
    setTimeout(() => {
      // Reset validation state
      setValidation({ error: null });
    }, VALIDATION_TIMEOUT_MS);
  }, [validation.error]);

  const userNotifications = useMemo(() => {
    if (scanState === 'blocked') {
      return (
        <Flex flexDirection="column" alignItems="center">
          <SadEmojiIcon height={40} width={40} data-testid={'sad-emoji-icon'} />
          <Text.Label color="secondary" data-testid={'camera-access-blocked-label'}>
            {i18n.t('paperWallet.scanShieldedMessage.cameraAccessBlocked')}
          </Text.Label>
        </Flex>
      );
    }
    if (scanState === 'waiting') {
      return (
        <Flex flexDirection="column" alignItems="center">
          <CameraIcon height={40} width={40} data-testid={'camera-icon'} />
          <Text.Label color="secondary" data-testid={'camera-access-prompt-label'}>
            {i18n.t('paperWallet.scanShieldedMessage.waitingForCameraAccess')}
          </Text.Label>
        </Flex>
      );
    }
    return null;
  }, [scanState]);

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.scanShieldedMessage.title')}
        description={
          <Trans
            i18nKey="paperWallet.scanShieldedMessage.description"
            components={{
              strong: <strong />
            }}
          />
        }
        currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      >
        <Flex gap="$16" alignItems="stretch" flexDirection="column" w="$fill" h="$fill">
          <Flex className={styles.scanArea} justifyContent="center" alignItems="center">
            {userNotifications}
            {videoDevices.length > 0 && (
              <Flex className={cn({ [styles.hidden]: scanState !== 'scanning' })} h="$fill" w="$fill">
                <Box className={styles.videoContainer}>
                  <video
                    className={cn([styles.video, flipVideoScaleX && styles.flipVideoScaleX])}
                    ref={videoRef}
                    autoPlay
                    playsInline
                    data-testid={'camera-preview-box'}
                  />
                  <canvas ref={canvasRef} className={styles.hidden} />
                </Box>
                {videoDevices.length > 1 && (
                  <Box className={styles.mediaSelectContainer}>
                    <Select.Root
                      align="selected"
                      variant="outline"
                      value={deviceId}
                      onChange={handleDeviceChange}
                      showArrow
                      zIndex={99_999}
                      id={'camera-selection-box'}
                    >
                      {VideoDeviceSelectOptions}
                    </Select.Root>
                  </Box>
                )}
              </Flex>
            )}
          </Flex>
          <Flex justifyContent="space-between" h={'$48'} alignItems="center">
            <Button.Secondary
              onClick={() => {
                endVideoTracks();
                back();
              }}
              label={i18n.t('core.walletSetupStep.back')}
              title={i18n.t('core.walletSetupStep.back')}
              data-testid="wallet-setup-step-btn-back"
            />
            {scanState === 'scanning' && !validation.error && (
              <Flex alignItems="center" gap="$8" h="$48">
                <Loader className={styles.loader} />
                <Text.Label color="secondary" data-testid={'loader-label'}>
                  {i18n.t('paperWallet.scanShieldedMessage.lookingForWallet')}
                </Text.Label>
              </Flex>
            )}
            {!!validation.error && (
              <Flex alignItems="center" gap="$8" h="$48">
                <WarningIcon width={24} height={24} data-testid={'error-icon'} />
                <Flex flexDirection="column">
                  <Text.Body.Small color="secondary" weight="$bold" data-testid={'error-title'}>
                    {validation.error.title}
                  </Text.Body.Small>
                  <Text.Label color="secondary" data-testid={'error-description'}>
                    {validation.error.description}
                  </Text.Label>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Flex>
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
