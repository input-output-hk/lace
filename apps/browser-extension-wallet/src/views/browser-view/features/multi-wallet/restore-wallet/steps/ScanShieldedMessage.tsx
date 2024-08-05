/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-console */
import React, { useMemo, useState, useEffect, useRef, VFC } from 'react';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { useRestoreWallet } from '../context';
import { Wallet } from '@lace/cardano';
import {
  Box,
  Flex,
  Select,
  Button,
  Loader,
  Text,
  SadEmojiComponent as SadEmojiIcon,
  CameraComponent as CameraIcon,
  WarningIconCircleComponent as WarningIcon
} from '@input-output-hk/lace-ui-toolkit';
import * as openpgp from 'openpgp';
import { readBinaryPgpMessage } from '@src/utils/pgp';
import { i18n } from '@lace/translation';
import jsQR, { QRCode } from 'jsqr';
import { Trans } from 'react-i18next';
import styles from './ScanShieldedMessage.module.scss';
import cn from 'classnames';
import { ChainName } from '@lace/cardano/dist/wallet';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';

interface Validation {
  error?: {
    title: string;
    description: string;
  };
}

const VALIDATION_TIMEOUT_MS = 2000;

const stripDetailFromVideoDeviceName = (str: string) => str.replace(/\s(camera\s?)\(?.*\)?$/i, '');

type QrCodeScanState = 'waiting' | 'blocked' | 'scanning' | 'validating' | 'scanned';

interface MediaReaderProps {
  videoDevices: MediaDeviceInfo[];
  setScanState: React.Dispatch<React.SetStateAction<QrCodeScanState>>;
  onScanCode: (code: QRCode) => void;
  scanState: QrCodeScanState;
}

const endAllStreams = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  } else {
    // fallback
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((mediaStream) => {
        const currentStream = mediaStream;
        const tracks = currentStream.getTracks();
        tracks[0].stop();
      })
      .catch((error) => {
        console.log(error);
      });
  }
};

const VideoInputQrCodeReader = ({ videoDevices, setScanState, onScanCode, scanState }: MediaReaderProps) => {
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [deviceId, setDeviceId] = useState<MediaDeviceInfo['deviceId'] | null>();

  const handleDeviceChange = (value: MediaDeviceInfo['deviceId']) => {
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
    setDeviceId(videoDevices[0].deviceId);
  }, [videoDevices]);

  useEffect(() => {
    let animationRequest: number;
    const getVideoStream = async () => {
      try {
        endAllStreams(streamRef.current);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setScanState('scanning');
        void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_CAMERA_OK);
        streamRef.current = stream;
      } catch (error) {
        // Map error messages
        if (error.message === 'Permission denied' || error.name === 'NotAllowedError') {
          setScanState('blocked');
          void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_CAMERA_ERROR);
        }
      }
    };

    const scanQRCode = async () => {
      if (!videoRef?.current?.srcObject || !canvasRef.current || !streamRef.current) {
        endAllStreams(streamRef.current);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
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
      animationRequest = requestAnimationFrame(scanQRCode);
    };
    getVideoStream();

    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        animationRequest = requestAnimationFrame(scanQRCode);
      });
    }

    return () => {
      videoRef.current = null;
      endAllStreams(streamRef.current);
      cancelAnimationFrame(animationRequest);
    };
  }, [
    deviceId,
    setScanState,
    onScanCode,
    analytics,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_ERROR,
    postHogActions.restore.SCAN_QR_CODE_CAMERA_OK
  ]);

  return (
    <Flex style={{ ...(scanState !== 'scanning' && { display: 'none' }) }} h="$fill" w="$fill">
      {videoDevices.length > 1 && (
        <Box className={styles.mediaSelectContainer}>
          <Select.Root
            align="selected"
            variant="outline"
            value={deviceId || videoDevices[0]?.deviceId}
            onChange={handleDeviceChange}
            showArrow
          >
            {VideoDeviceSelectOptions}
          </Select.Root>
        </Box>
      )}
      <Box className={styles.videoContainer}>
        <video
          className={cn([styles.video, flipVideoScaleX && styles.flipVideoScaleX])}
          ref={videoRef}
          autoPlay
          playsInline
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Box>
    </Flex>
  );
};

interface ByteChunk<T> {
  bytes: number[];
  text?: T;
  type: 'byte';
}

type ScannedCode = [ByteChunk<null>, ByteChunk<string>, ByteChunk<ChainName>];

export const ScanShieldedMessage: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const { back, next, pgpInfo, setPgpInfo, setWalletMetadata } = useRestoreWallet();
  const [validation, setValidation] = useState<Validation>({ error: null });
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [scanState, setScanState] = useState<QrCodeScanState>('waiting');

  const onScanSuccess = (message: openpgp.Message<Uint8Array>, address: string, chain: ChainName) => {
    setPgpInfo({ ...pgpInfo, shieldedMessage: message });
    setWalletMetadata({ chain, address });
    setValidation({ error: null });
    setScanState('scanned');
    void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_READ_SUCCESS);
  };

  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const localVideoDevices = allDevices.filter((device) => device.kind === 'videoinput');
        setVideoDevices(localVideoDevices);
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };
    enumerateDevices();
  }, []);

  const onScanCode = async (code: QRCode) => {
    try {
      const [shieldedMessage, address, chain] = code.chunks as ScannedCode;
      if (!shieldedMessage?.bytes || !address?.text || !chain?.text) return; // wait for code to be scanned in it's entirety
      const shieldedPgpMessage = await readBinaryPgpMessage(new Uint8Array(shieldedMessage.bytes));
      onScanSuccess(shieldedPgpMessage, address.text, chain.text);
      setScanState('scanned');
      // Immediately move to next step

      next();
    } catch {
      try {
        // User may have scanned the wallet address QR code
        if (Wallet.Cardano.Address.fromString(code.data)) {
          setValidation({
            error: { title: 'Wrong QR code identified', description: 'Scan paper wallet private QR code' }
          });
        }
      } catch (error) {
        setValidation({ error: { title: 'Unidentified QR code', description: 'Scan your Lace paper wallet' } });
        throw error;
      }
      void analytics.sendEventToPostHog(postHogActions.restore.SCAN_QR_CODE_READ_ERROR);
      setTimeout(() => {
        // Reset validation state
        setValidation({ error: null });
        setScanState('scanning');
      }, VALIDATION_TIMEOUT_MS);
    }
  };

  const userNotifications = useMemo(() => {
    if (scanState === 'blocked') {
      return (
        <Flex flexDirection="column" alignItems="center">
          <SadEmojiIcon height={40} width={40} />
          <Text.Label color="secondary">{i18n.t('paperWallet.scanShieldedMessage.cameraAccessBlocked')}</Text.Label>
        </Flex>
      );
    }
    if (scanState === 'waiting') {
      return (
        <Flex flexDirection="column" alignItems="center">
          <CameraIcon height={40} width={40} />
          <Text.Label color="secondary">{i18n.t('paperWallet.scanShieldedMessage.waitingForCameraAccess')}</Text.Label>
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
              <VideoInputQrCodeReader
                videoDevices={videoDevices}
                setScanState={setScanState}
                onScanCode={onScanCode}
                scanState={scanState}
              />
            )}
          </Flex>
          <Flex justifyContent="space-between" h={'$48'} alignItems="center">
            <Button.Secondary onClick={back} label="Back" title="Back" />
            {scanState === 'scanning' && !validation.error && (
              <Flex alignItems="center" gap="$8" h="$48">
                <Loader w="$24" h="$24" />
                <Text.Label color="secondary">{i18n.t('paperWallet.scanShieldedMessage.lookingForWallet')}</Text.Label>
              </Flex>
            )}
            {!!validation.error && (
              <Flex alignItems="center" gap="$8" h="$48">
                <WarningIcon width={24} height={24} />
                <Flex flexDirection="column">
                  <Text.Body.Small color="secondary" weight="$bold">
                    {validation.error.title}
                  </Text.Body.Small>
                  <Text.Label color="secondary">{validation.error.description}</Text.Label>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Flex>
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
