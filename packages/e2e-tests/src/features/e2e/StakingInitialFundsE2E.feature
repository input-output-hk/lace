@Staking-initial-E2E @E2E @Testnet
Feature: Delegating funds to new pool E2E

  @LW-2685 @Smoke
  Scenario: Extended view - Staking - Delegating funds to new pool (if not staked yet) E2E.
    Given I create new wallet and save wallet information
    And Wallet is synced
    When I open header menu
    Then I don't see any toast message
    And I click "Receive" button on page header
    When I click "Copy" button on "Receive" page for default wallet address
    Then I see a toast with text: "Address copied"
    When I open wallet: "WalletSendingAdaToStakingE2E" in: extended mode
    And Wallet is synced
    And I click "Send" button on page header
    And I fill bundle 1 with "" copied address with following assets:
      | type | assetName | amount |
      | ADA  | tADA      | 15     |
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "5.00 tADA" and tokens count 1
    When I open wallet: "newCreatedWallet" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "5.00 tADA" and tokens count 1
    And I disable showing Multidelegation beta banner
    And I disable showing Multidelegation DApps issue modal
    And I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I pick "4" pools for delegation from browse pools view: "ZZZG3, YATP, XSP, CENT"
    And I click "Next" button on staking portfolio bar
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    And I enter newly created wallet password and confirm staking
    Then Initial staking success drawer is displayed
    When I click "Close" button on staking success drawer
    And I open Overview tab
    And I wait until delegation info card shows staking to "4" pool(s)
    And I save identifiers of stake pools currently in use
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    And I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking with metadata
    And I close the drawer by clicking close button
