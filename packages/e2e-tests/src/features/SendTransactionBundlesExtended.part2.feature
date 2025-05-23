@SendTx-Bundles-Extended @Testnet
Feature: Send - Extended Browser View (Advanced Tx)

  Background:
    Given Wallet is synced

  @LW-3564
  Scenario: Extended-view - Check tx fee and ADA allocation for multi asset tx
    Given I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I enter a value of: 1 to the 'tADA' asset in bundle 1
    When I click 'Add bundle' button on 'Send' page
    And I enter a valid 'shelley' address in the bundle 2 recipient's address
    And click on the coin selector for 'tADA' asset in bundle 2
    And click on an token with name: 'LaceCoin'
    And I enter a value of: 1 to the 'LaceCoin1' asset in bundle 2
    Then transaction fee is around 0.20 ADA and Ada allocation cost is around 1.07 ADA

  @LW-4505
  Scenario: Extended-view - Cancel transaction with multiple bundles on Summary page
    Given I click 'Send' button on page header
    When I set 2 bundles with multiple assets
    And I click 'Review transaction' button on 'Send' page
    And I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-3580
  Scenario: Extended-view - Cancel transaction with multiple bundles on Password page
    Given I click 'Send' button on page header
    When I set 2 bundles with multiple assets
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    Then Drawer is displayed
    When I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-3560
  Scenario: Extended View - Validation of insufficient balance error
    When I save token: 'Cardano' balance
    And I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I enter a 51% of total 'tADA' asset in bundle 1
    And I open cancel modal to trigger button validation
    Then I do not see insufficient balance error in bundle 1 for 'tADA' asset
    And 'Review transaction' button is enabled on 'Send' page
    When I click 'Add bundle' button on 'Send' page
    And I enter a valid 'shelley' address in the bundle 2 recipient's address
    And I enter a 51% of total 'tADA' asset in bundle 2
    And I open cancel modal to trigger button validation
    Then I see insufficient balance error in bundle 2 for 'tADA' asset
    And I do not see insufficient balance error in bundle 1 for 'tADA' asset
    And 'Review transaction' button is disabled on 'Send' page

  @LW-1762
  Scenario: Extended view: Send - Token can be added once for each bundle
    When I click 'Send' button on page header
    And I click 'Add bundle' button on 'Send' page
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    And I click 'Add token or NFT' button for bundle 1
    And Token with name: 'LaceCoin' is not displayed in coin selector
    And I close the drawer by clicking back button
    And I click 'Add token or NFT' button for bundle 2
    Then Token with name: 'LaceCoin' is displayed in coin selector

  @LW-4731
  Scenario: Extended view: Send - NFT is not displayed in coin selector if it was already added to bundle
    When I click 'Send' button on page header
    And I click 'Add bundle' button on 'Send' page
    And I click 'Add token or NFT' button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: 'Ibilecoin'
    And I click 'Add token or NFT' button for bundle 2
    And click on the NFTs button in the coin selector dropdown
    Then NFT with name: 'Ibilecoin' is not displayed in coin selector

  @LW-3748
  Scenario: Extended-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    And I click MAX button in bundle 1 for 'LaceCoin1' asset
    Then the maximum available amount is displayed in bundle: 1 for 'LaceCoin1' asset

  @LW-3747
  Scenario: Extended-view - send maximum amount of multiple assets by clicking MAX button
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
#    disabled until 'utxo fully depleted' error is fixed for MAX tADA
#    And I click MAX button in bundle 1 for 'tADA' asset
#    Then the maximum available amount is displayed in bundle: 1 for 'tADA' asset
    When I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    And I click MAX button in bundle 1 for 'LaceCoin1' asset
    Then the maximum available amount is displayed in bundle: 1 for 'LaceCoin1' asset
    When I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin2'
    And I click MAX button in bundle 1 for 'LaceCoin2' asset
    Then the maximum available amount is displayed in bundle: 1 for 'LaceCoin2' asset
    When I click 'Add token or NFT' button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: 'Ibilecoin'
    Then the maximum available amount is displayed in bundle: 1 for 'Ibilecoin' asset
    When I click 'Add token or NFT' button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: 'Bison Coin'
    Then the maximum available amount is displayed in bundle: 1 for 'Bison Coin' asset
    And 'Review transaction' button is enabled on 'Send' page

  @LW-3749 @Pending
  @issue=LW-10818
  Scenario: Extended-view - When adding MAX amount of a token, it isn't displayed in next bundle
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for 'tADA' asset
    And I click 'Add bundle' button on 'Send' page
    Then the 'tADA' asset is not displayed in bundle 2
    When I click 'Add token or NFT' button for bundle 2
    Then the asset 'tADA' is not displayed in the token list

  @LW-1605 @LW-1606
  Scenario: 'Insufficient funds' error for extended view & advanced tx type - summing values for multiple assets
    And I save token: 'Cardano' balance
    And I save token: 'LaceCoin' balance
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I enter a 51% of total 'tADA' asset in bundle 1
    And I click 'Add bundle' button on 'Send' page
    And I enter a valid 'shelley' address in the bundle 2 recipient's address
    And I click 'Add token or NFT' button for bundle 2
    And click on an token with name: 'LaceCoin'
    And I enter a 55% of total 'tADA' asset in bundle 2
    And I enter a 51% of total 'LaceCoin1' asset in bundle 2
    Then I do not see insufficient balance error in bundle 1 for 'tADA' asset
    And I see insufficient balance error in bundle 2 for 'tADA' asset
    And I do not see insufficient balance error in bundle 2 for 'LaceCoin1' asset
    And 'Review transaction' button is disabled on 'Send' page

  @LW-3578
  @Pending # due to issues with Fetch.enable
  Scenario: Extended-view - Transaction error screen displayed for multiple bundles on transaction submit error
    Given I enable network interception to finish request: '*/tx-submit/submit' with error 400
    And I click 'Send' button on page header
    And I set 2 bundles with the same assets
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    When I enter correct password and confirm the transaction
    Then The Transaction error screen is displayed in extended mode
