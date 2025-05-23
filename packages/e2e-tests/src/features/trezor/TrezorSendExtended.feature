@TrezorSendExtended @Trezor @Testnet
Feature: Trezor Send extended

  @LW-7878
  Scenario: Extended-view - Send ADA (single asset) E2E
    Given I connect, unlock and enter correct pin on Trezor emulator
    And I save token: 'Cardano' balance
    When I click 'Send' button on page header
    And I fill bundle 1 with 'WalletReceiveSimpleTransactionE2E' main address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 2.1234 |
    And I click 'Review transaction' button on 'Send' page
    And I save fee value
    And I click 'Confirm' button on 'Transaction summary' page
    And I reject analytics and click 'Allow once for this session' on Trezor Connect page
    And I confirm send simple transaction on Trezor emulator
    And I switch to window with Lace
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Tokens extended page
    Then the sent amount of: '2.123' with 'saved' fee for token 'Cardano' is subtracted from the total balance
    When I navigate to Activity extended page
    Then the Sent transaction is displayed with value: '2.29 tADA' and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as 'core.activityDetails.sent' for ADA with value: 2.12 and wallet: 'WalletReceiveSimpleTransactionE2E' address
    When I open wallet: 'WalletReceiveSimpleTransactionE2E' in: extended mode
    And Wallet is synced
    And I navigate to Activity extended page
    Then the Received transaction is displayed with value: '2.12 tADA' and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    And The Tx details are displayed as 'core.activityDetails.received' for ADA with value: 2.12 and wallet: 'TrezorWallet' address


