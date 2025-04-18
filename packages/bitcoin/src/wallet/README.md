# **Bitcoin Observable Wallet Proof of Concept**

This project is a implementation of a simple Bitcoin wallet, built using **TypeScript** and leveraging:
- **BitcoinJS** for address/key derivation and transaction building/signing.
- **Maestro API** to interact with the Bitcoin network (Testnet or Mainnet) for transaction history, UTXO retrieval, and broadcasting transactions.
- **RxJS** for reactive programming to observe wallet state, transaction history, and UTXO updates.

---

## **Features**

1. **Address and Key Derivation**:
  - Supports **BIP32** and **Electrum-compatible** derivation paths.
  - Generates:
    - Legacy (P2PKH)
    - SegWit (P2SH-P2WPKH)
    - Native SegWit (P2WPKH)
    - Taproot (P2TR) addresses.

2. **Transaction History and UTXOs**:
  - Fetches transaction history for specified addresses.
  - Retrieves **UTXOs** (Unspent Transaction Outputs) for address spending.

3. **Balance Tracking**:
  - Continuously tracks and updates wallet balance based on UTXOs.

4. **Transaction Building and Signing**:
  - Constructs a raw transaction from available UTXOs.
  - Signs the transaction using the derived private key.
  - Submits the transaction to the Bitcoin network.

5. **Transaction Tracking**:
  - Tracks the status of a transaction (e.g., Pending, Confirmed, or Dropped) until it is included in a block.
