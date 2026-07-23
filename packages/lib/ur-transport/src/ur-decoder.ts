import { URDecoder } from '@ngraveio/bc-ur';

/** Outcome of feeding one part into a {@link UrPartDecoder}. */
export interface UrReceiveResult {
  /** Whether the full payload has been reassembled. */
  complete: boolean;
  /** Estimated reassembly progress in the range 0..1. */
  progress: number;
}

/** A reassembled UR message: its type string and untagged CBOR body. */
export interface UrResult {
  urType: string;
  cbor: Uint8Array;
}

/**
 * Accumulates scanned animated-QR part strings into a complete (urType, cbor)
 * result. Tolerates out-of-order and duplicate or redundant fountain parts;
 * each {@link receivePart} reports whether the payload is complete and the
 * current progress.
 */
export class UrPartDecoder {
  private readonly decoder = new URDecoder();

  /**
   * Feeds one part string into the decoder. Parts are accepted in any letter
   * case: devices emit upper-case frames for QR alphanumeric mode and the
   * underlying UR decoding is case-insensitive.
   *
   * @returns completion state and progress (0..1) after this part.
   */
  public receivePart(part: string): UrReceiveResult {
    this.decoder.receivePart(part);
    return {
      complete: this.isComplete(),
      progress: this.decoder.estimatedPercentComplete(),
    };
  }

  /** Whether the payload has been fully reassembled. */
  public isComplete(): boolean {
    return this.decoder.isComplete() === true;
  }

  /** Estimated reassembly progress in the range 0..1. */
  public progress(): number {
    return this.decoder.estimatedPercentComplete();
  }

  /**
   * Terminal decode failure message, or undefined while decoding can still
   * succeed. Once the underlying fountain decoder reports failure (checksum
   * mismatch on the fully reassembled message) the instance can never
   * complete and must be replaced.
   */
  public failureMessage(): string | undefined {
    return this.decoder.isError() ? this.decoder.resultError() : undefined;
  }

  /**
   * Returns the reassembled (urType, cbor) result.
   *
   * @throws if called before the stream is complete or if decoding failed.
   */
  public result(): UrResult {
    if (!this.isComplete()) {
      throw new Error('UR stream is not complete');
    }
    if (!this.decoder.isSuccess()) {
      throw new Error(`UR decode failed: ${this.decoder.resultError()}`);
    }
    const ur = this.decoder.resultUR();
    return { urType: ur.type, cbor: Uint8Array.from(ur.cbor) };
  }
}

/** Creates a fresh {@link UrPartDecoder}. */
export const createUrDecoder = (): UrPartDecoder => new UrPartDecoder();
