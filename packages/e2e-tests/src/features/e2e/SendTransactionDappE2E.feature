@SendTransactionDapp-E2E @E2E @Testnet
Feature: Send Transactions from Dapp - E2E

  Background:
    Given Wallet is synced

  @LW-3761 @Testnet @Smoke
  Scenario: Send ADA from DApp E2E
    And I save token: "Cardano" balance
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "WalletReceiveDappTransactionE2E" in test DApp
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -3.00 tADA - FEE |
    And I save fee value on DApp "Confirm transaction" page
    And I click "Confirm" button on "Confirm transaction" page
    And I see DApp connector "Sign transaction" page
    And I fill correct password
    And I click "Confirm" button on "Sign transaction" page
    And I see DApp connector "All done" page
    And I click "Close" button on DApp "All done" page
    And I don't see DApp window
    And I switch to window with Lace
    And I navigate to Tokens extended page
    Then the sent amount of: "3" with "DApp transaction" fee for token "Cardano" is subtracted from the total balance
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "3.00 tADA" and tokens count 1
    And I click on a transaction: 1
    Then The Tx details are displayed as "core.activityDetails.sent" for ADA with value: 3.00 and wallet: "WalletReceiveDappTransactionE2E" address
    When I open wallet: "WalletReceiveDappTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "3.00 tADA" and tokens count 1
    And I click on a transaction: 1
    Then The Tx details are displayed as "core.activityDetails.received" for ADA with value: 3.00 and wallet: "WalletSendDappTransactionE2E" address

  @LW-6797 @Testnet @memory-snapshot
  Scenario: Send Token from DApp E2E
    And I de-authorize all DApps in extended mode
    And I save token: "LaceCoin2" balance
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "WalletReceiveDappTransactionE2E" in test DApp
    And I click "Send Token" button in test DApp
    When I click "Send Token" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -1.38 tADA - FEE |
      | -2 LaceCoin2     |
    And I expand "From address" section in DApp transaction window
    And I see DApp connector "Confirm transaction" page "From address" section with following data:
      | Address WalletSendDappTransactionE2E own |
      | Tokens -2 item(s)                        |
      | -1.38 tADA - FEE                         |
      | -2 LaceCoin2                             |
    And I expand "To address" section in DApp transaction window
    And I see DApp connector "Confirm transaction" page "To address" section with following data:
      | Address WalletReceiveDappTransactionE2E foreign |
      | Tokens 2 item(s)                                |
      | 1.38 tADA                                       |
      | 2 LaceCoin2                                     |
    And I save fee value on DApp "Confirm transaction" page
    And I click "Confirm" button on "Confirm transaction" page
    And I see DApp connector "Sign transaction" page
    And I fill correct password
    And I click "Confirm" button on "Sign transaction" page
    And I see DApp connector "All done" page
    And valid password is not in snapshot
    And I click "Close" button on DApp "All done" page
    And I don't see DApp window
    And I switch to window with Lace
    And I navigate to Tokens extended page
    Then the sent amount of: "2" for token "LaceCoin2" is subtracted from the total balance
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "1.38 tADA, 2 LaceCoin2" and tokens count 2
    And I click on a transaction: 1
    Then The Tx details are displayed as "core.activityDetails.sent" for ADA with value: "1.38" and LaceCoin2 with value: "2" and wallet: "WalletReceiveDappTransactionE2E" address
    When I open wallet: "WalletReceiveDappTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "1.38 tADA" and tokens count 2
    And I click on a transaction: 1
    Then The Tx details are displayed as "core.activityDetails.received" for ADA with value: "1.38" and LaceCoin2 with value: "2" and wallet: "WalletSendDappTransactionE2E" address

  @LW-9279 @Testnet
  Scenario: Defect LW-9273 - User is not able to accept second DApp transaction until close first DApp window
    And I de-authorize all DApps in extended mode
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "WalletReceiveDappTransactionE2E" in test DApp
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -3.00 tADA - FEE |
    And I click "Confirm" button on "Confirm transaction" page
    And I see DApp connector "Sign transaction" page
    And I fill correct password
    And I click "Confirm" button on "Sign transaction" page
    And I see DApp connector "All done" page
    And I click "Send ADA" "Run" button in test DApp without retry
    When I switch to last window
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -3.00 tADA - FEE |
