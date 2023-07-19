@SendTransactionDapp-E2E @Testnet
Feature: Send Transactions from Dapp - E2E

  Background:
    Given Wallet is synced

  @Pending @LW-3761 @Testnet @Smoke
    # Bug LW-7482
  Scenario: Send ADA from DApp E2E
    And I save token: "Cardano" balance
    And I open and authorize test DApp with "Only once" setting
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with: "3.00 ADA" and: "0" assets
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
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.sent" for ADA with value: 3.00 and wallet: "WalletReceiveSimpleTransactionE2E" address
    When I open wallet: "WalletReceiveSimpleTransactionE2E" in: extended mode
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "3.00 tADA" and tokens count 1
    And I click on a transaction: 1
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.received" for ADA with value: 3.00 and wallet: "WalletSendSimpleTransactionE2E" address

  @Pending @LW-6797 @Testnet
    # Bug LW-7482
  Scenario: Send Token from DApp E2E
    And I save token: "LaceCoin2" balance
    And I open and authorize test DApp with "Only once" setting
    And I click "Send Token" button in test DApp
    When I click "Send Token" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with: "1.38 ADA" and: "2 LaceCoin2" assets
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
    Then the sent amount of: "2" for token "LaceCoin2" is subtracted from the total balance
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "1.38 tADA, 2 LaceCoin2" and tokens count 2
    And I click on a transaction: 1
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.sent" for ADA with value: "1.38" and LaceCoin2 with value: "2" and wallet: "WalletReceiveSimpleTransactionE2E" address
    When I open wallet: "WalletReceiveSimpleTransactionE2E" in: extended mode
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "1.38 tADA" and tokens count 2
    And I click on a transaction: 1
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.received" for ADA with value: "1.38" and LaceCoin2 with value: "2" and wallet: "WalletSendSimpleTransactionE2E" address
