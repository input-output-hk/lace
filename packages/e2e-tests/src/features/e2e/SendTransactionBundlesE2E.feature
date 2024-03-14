@SendTransactionBundles-E2E @Testnet
Feature: Send Transaction bundles - E2E

  @LW-4121 @LW-4122 @LW-3556 @Smoke @Pending
  @issue=LW-8958
  Scenario: Extended view - Sending multiple assets and bundles E2E
    Given Wallet is synced
    And I save token: "Cardano" balance
    And I click "Send" button on page header
    And I fill bundle 1 with "WalletFirstReceiveBundlesTransactionE2E" address with following assets:
      | type  | assetName | amount | ticker    |
      | ADA   | Cardano   | 1      | tADA      |
      | Token | LaceCoin  | 1      | LaceCoin1 |
      | Token | LaceCoin3 | 0.2333 | LaceCoin3 |
    When I click "Add bundle" button on "Send" page
    And I fill bundle 2 with "WalletSecondReceiveBundlesTransactionE2E" address with following assets:
      | type  | assetName | amount | ticker    |
      | ADA   | Cardano   | 2      | tADA      |
      | Token | LaceCoin  | 2      | LaceCoin1 |
    When I click "Add bundle" button on "Send" page
    And I fill bundle 3 with "WalletSecondReceiveBundlesTransactionE2E" address with following assets:
      | type  | assetName | amount | ticker    |
      | ADA   | Cardano   | 1      | tADA      |
      | Token | LaceCoin2 | 1      | LaceCoin2 |
    And I enter maximum metadata allowed
    And I save the metadata value
    And I click "Review transaction" button on "Send" page
    And I save fee value
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Tokens extended page
    Then the sent amount of: "4.50" with "saved" fee for token "Cardano" is subtracted from the total balance
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "4.50 tADA, 0.2333 LaceCoin3, 3 LaceCoin , +1" and tokens count 4
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.sent" for 4 tokens with following details:
      | address                                  | ada       | assets                      |
      | WalletFirstReceiveBundlesTransactionE2E  | 1.34 tADA | 0.2333 LaceCoin3,1 LaceCoin |
      | WalletSecondReceiveBundlesTransactionE2E | 2.00 tADA | 2 LaceCoin                  |
      | WalletSecondReceiveBundlesTransactionE2E | 1.16 tADA | 1 LaceCoin2                 |
    And The Tx details display the sent metadata
    When I open wallet: "WalletFirstReceiveBundlesTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "1.34 tADA, 0.2333 LaceCoin3, 1 LaceCoin" and tokens count 3
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.received" for 3 tokens with following details:
      | address                         | ada       | assets                      |
      | WalletSendBundlesTransactionE2E | 1.34 tADA | 0.2333 LaceCoin3,1 LaceCoin |
    When I open wallet: "WalletSecondReceiveBundlesTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "3.16 tADA, 2 LaceCoin, 1 LaceCoin2" and tokens count 3
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.received" for 3 tokens with following details:
      | address                         | ada       | assets      |
      | WalletSendBundlesTransactionE2E | 2.00 tADA | 2 LaceCoin  |
      | WalletSendBundlesTransactionE2E | 1.16 tADA | 1 LaceCoin2 |
