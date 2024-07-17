/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * The transaction structure for shared wallet
 */
export interface SharedWalletTransactionSchema {
  metadata: {
    [k: string]: unknown;
    /**
     * The CIP34 formatted chainId the transaction should be submitted to
     */
    chainId: string;
    /**
     * The date and time the transaction was created
     */
    createdAt: string;
    /**
     * The public key of the creator of the transaction
     */
    createdBy: string;
    /**
     * A note about the transaction
     */
    note?: string;
  };
  transaction: {
    [k: string]: unknown;
    /**
     * This contains the CBOR for the transaction
     */
    cborHex: string;
  };
  /**
   * The version of the schema you are using
   */
  version: string;
}
