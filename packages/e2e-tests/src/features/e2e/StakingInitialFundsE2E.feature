@Staking-initial-E2E @Testnet
Feature: Delegating funds to new pool E2E

  @LW-2685 @Smoke
  Scenario: Extended view - Staking - Delegating funds to new pool (if not staked yet) E2E.
    Given I create new wallet and save wallet information
    When I open header menu
    And I click on the user details button
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    When I open wallet: "WalletSendingAdaToStakingE2E" in: extended mode
    And Wallet is synced
    And I click "Send" button on page header
    And I fill bundle 1 with "CopiedAddress" address with following assets:
      | type | assetName | amount |
      | ADA  | tADA      | 5      |
    And I click "browserView.transaction.send.footer.review" button with custom timeout 15000
    And I click "browserView.transaction.send.footer.confirm" button
    And I fill correct password and confirm
    Then The Transaction submitted screen is displayed:
      | Title: "All done"                            |
      | Subtitle: "The transaction will complete..." |
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "5.00 tADA" and tokens count 1
    When I open wallet: "newCreatedWallet" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "5.00 tADA" and tokens count 1
    And I navigate to Staking extended page
    And I input "ADA Capital" to search bar
    And I wait for single search result
    And I click stake pool with the name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
    And I save stakepool info
    When I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill new created wallet password and confirm
    Then Initial Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    And I wait until current stake pool switch to "ADA Capital"
    Then I see currently staking component for stake pool: "ADA Capital" in extended mode
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    And I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking with metadata

  @LW-2686
  Scenario: Popup view - Staking - Delegating funds to new pool (if not staked yet) E2E.
    Given I create new wallet and save wallet information
    When I open header menu
    And I click on the user details button
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    When I open wallet: "WalletSendingAdaToStakingE2E" in: extended mode
    And Wallet is synced
    And I click "Send" button on page header
    And I fill bundle 1 with "CopiedAddress" address with following assets:
      | type | assetName | amount |
      | ADA  | tADA      | 5      |
    And I click "browserView.transaction.send.footer.review" button with custom timeout 15000
    And I click "browserView.transaction.send.footer.confirm" button
    And I fill correct password and confirm
    Then The Transaction submitted screen is displayed:
      | Title: "All done"                            |
      | Subtitle: "The transaction will complete..." |
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "5.00 tADA" and tokens count 1
    And I navigate to home page on popup view.
    And I open wallet: "newCreatedWallet" in: popup mode
    And Wallet is synced
    And I navigate to Transactions popup page
    Then the Received transaction is displayed with value: "5.00 tADA" and tokens count 1
    And I navigate to Staking popup page
    And I input "ADA Capital" to search bar
    And I wait for single search result
    And I click stake pool with the name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
    When I save stakepool info
    When I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill new created wallet password and confirm
    Then Initial Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    And I wait until current stake pool switch to "ADA Capital"
    Then I see currently staking component for stake pool: "ADA Capital" in popup mode
    When I navigate to Transactions popup page
    Then I can see transaction 1 with type "Delegation"
    And I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking with metadata
