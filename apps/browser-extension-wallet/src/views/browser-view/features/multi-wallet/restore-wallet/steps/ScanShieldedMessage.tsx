/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useMemo, useState, useEffect, useRef, useCallback, VFC } from 'react';
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

const VideoInputQrCodeReader = ({ videoDevices, setScanState, onScanCode, scanState }: MediaReaderProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [deviceId, setDeviceId] = useState<MediaDeviceInfo['deviceId'] | null>();

  const handleDeviceChange = (value: MediaDeviceInfo['deviceId']) => {
    setDeviceId(value);
  };

  const stopVideoTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [streamRef]);

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
    const getVideoStream = async () => {
      try {
        stopVideoTracks();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setScanState('scanning');
        streamRef.current = stream;
      } catch (error) {
        // Map error messages
        if (error.message === 'Permission denied' || error.name === 'NotAllowedError') {
          setScanState('blocked');
        }
      }
    };

    const scanQRCode = async () => {
      if (!videoRef?.current?.srcObject || !canvasRef.current || !streamRef.current) {
        stopVideoTracks();
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setScanState('validating');
        onScanCode(code);
      }
      requestAnimationFrame(scanQRCode);
    };

    getVideoStream();

    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        requestAnimationFrame(scanQRCode);
      });
    }

    return () => stopVideoTracks();
  }, [deviceId, stopVideoTracks, setScanState, onScanCode]);

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
  const { back, next, pgpInfo, setPgpInfo, setWalletMetadata } = useRestoreWallet();
  const [validation, setValidation] = useState<Validation>({ error: null });
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [scanState, setScanState] = useState<QrCodeScanState>('waiting');

  const onScanSuccess = (message: openpgp.Message<Uint8Array>, address: string, chain: ChainName) => {
    setPgpInfo({ ...pgpInfo, shieldedMessage: message });
    setWalletMetadata({ chain, address });
    setValidation({ error: null });
    setScanState('scanned');
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
      if (!shieldedMessage?.bytes || !address?.text || !chain?.text) throw new Error('QR code malformed');
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
        paperWalletEnabled
      >
        <Flex gap="$16" alignItems="stretch" flexDirection="column" w="$fill" h="$fill">
          <Flex className={styles.scanArea} justifyContent="center" alignItems="center">
            {userNotifications}
            {videoDevices.length > 0 && !pgpInfo.shieldedMessage && (
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
