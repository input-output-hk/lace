import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';

const SCAN_INTERVAL_MS = 120;

/**
 * Longest edge of the frame handed to jsQR. Decoding the full-resolution
 * camera frame (e.g. 1280x720) every tick is needlessly expensive; QR frames
 * decode reliably from a bounded-size downscale.
 */
const MAX_DECODE_EDGE_PX = 640;

export type CameraPermissionState = 'denied' | 'granted' | 'pending';

export interface UseWebCameraScanProps {
  /** Called with each distinct QR string decoded from a video frame. */
  onFrame: (frame: string) => void;
  /** Stops the decode loop once reassembly completes. */
  isComplete: boolean;
}

export interface UseWebCameraScan {
  /** Ref to attach to the preview `<video>` element. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: CameraPermissionState;
  /** i18n key describing why the camera could not start (denied state only). */
  errorMessage: string | null;
  /**
   * Re-attempts getUserMedia. Calling this from a button press (user gesture)
   * lets Chrome surface its permission prompt when an automatic attempt was
   * blocked or dismissed.
   */
  requestCamera: () => void;
}

/**
 * Describes a getUserMedia failure so the UI can tell the user what to do.
 * Chrome rejects with no in-page prompt when the OS has blocked the camera for
 * the browser (NotAllowedError) or no device exists (NotFoundError); surfacing
 * the reason avoids the "denied but nothing prompts" dead-end.
 */
const describeError = (error: unknown): string => {
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'v2.ur-scanner.permission-blocked';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'v2.ur-scanner.no-camera';
    case 'NotReadableError':
    case 'AbortError':
      return 'v2.ur-scanner.camera-in-use';
    default:
      return 'v2.ur-scanner.permission-message';
  }
};

/**
 * Web camera capture for the extension tab/expanded view. Requests the camera
 * via getUserMedia (unavailable in MV3 popups/side panels), grabs frames onto
 * an offscreen canvas, and decodes them with the bundled jsQR (no CDN/remote
 * code, MV3-safe). Decoded strings are forwarded to {@link onFrame}; reassembly
 * happens in shared logic. Duplicate consecutive frames are suppressed.
 */
export const useWebCameraScan = ({
  onFrame,
  isComplete,
}: UseWebCameraScanProps): UseWebCameraScan => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [permission, setPermission] =
    useState<CameraPermissionState>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const decodeLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvasRef.current = canvas;
    const scale = Math.min(
      1,
      MAX_DECODE_EDGE_PX / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || canvas.width === 0 || canvas.height === 0) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (result?.data && result.data !== lastFrameRef.current) {
      lastFrameRef.current = result.data;
      onFrame(result.data);
    }
  }, [onFrame]);

  const requestCamera = useCallback(() => {
    setPermission('pending');
    setErrorMessage(null);
    setAttempt(count => count + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = undefined;
    };

    const requestStream = async (
      mediaDevices: MediaDevices,
    ): Promise<MediaStream> => {
      try {
        return await mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (error) {
        const name =
          error && typeof error === 'object' && 'name' in error
            ? String((error as { name: unknown }).name)
            : '';
        if (name === 'OverconstrainedError' || name === 'NotFoundError') {
          return mediaDevices.getUserMedia({ video: true });
        }
        throw error;
      }
    };

    const start = async () => {
      const mediaDevices = navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia) {
        setPermission('denied');
        setErrorMessage('v2.ur-scanner.no-camera');
        return;
      }
      try {
        const stream = await requestStream(mediaDevices);
        streamRef.current = stream;
        if (isCancelled) {
          stopStream();
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (isCancelled) {
          stopStream();
          return;
        }
        setPermission('granted');
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setPermission('denied');
        setErrorMessage(describeError(error));
      }
    };

    void start();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [attempt]);

  useEffect(() => {
    if (permission !== 'granted' || isComplete) {
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;

    const stopDecoding = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    /**
     * Decoding a hidden tab wastes CPU on frames nobody scans; pause while
     * the document is hidden and resume when it becomes visible again.
     */
    const syncWithVisibility = () => {
      if (document.hidden) {
        stopDecoding();
      } else if (timer === undefined) {
        timer = setInterval(decodeLoop, SCAN_INTERVAL_MS);
      }
    };

    syncWithVisibility();
    document.addEventListener('visibilitychange', syncWithVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncWithVisibility);
      stopDecoding();
    };
  }, [permission, isComplete, decodeLoop]);

  return { videoRef, permission, errorMessage, requestCamera };
};
