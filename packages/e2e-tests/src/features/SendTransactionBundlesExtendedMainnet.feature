@SendTx-Bundles-Extended @Mainnet
Feature: Send - Extended Browser View (Advanced Tx)

  Background:
    Given Wallet is synced

  @LW-2995
  Scenario: Extended-view - Adding/removing bundles
    Given I click "Send" button on page header
    And I see 1 bundle rows
    When I click "Add bundle" button on "Send" page
    And I click "Add bundle" button on "Send" page
    Then I see 3 bundle rows
    When I remove output 2 for advanced tx
    Then I see 2 bundle rows

  @LW-2996
  Scenario: Extended-view - setting ada for multiple bundles
    When I click "Send" button on page header
    Then the "ADA" asset is displayed in bundle 1
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    Then the "ADA" asset is displayed in bundle 2
    When I enter a valid "shelley" address in the bundle 2 recipient's address
    And I enter a value of: 1 to the "ADA" asset in bundle 2
    Then "Review transaction" button is enabled on "Send" page

  @LW-2997 @LW-5061
  Scenario: Extended-view - setting ada + testcoin for each bundle, including decimal input
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And I enter a value of: 0.2333 to the "SUNDAE" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And click on the coin selector for "ADA" asset in bundle 2
    And click on an token with name: "HOSKY Token"
    And I enter a value of: 1 to the "HOSKY" asset in bundle 2
    And I click "Add token or NFT" button for bundle 2
    And click on an token with name: "SUNDAE"
    And I enter a value of: 0.4799 to the "SUNDAE" asset in bundle 2
    Then "Review transaction" button is enabled on "Send" page

  @LW-2998
  Scenario: Extended-view - Tx summary page for two bundles
    Given I click "Send" button on page header
    When I set 2 bundles with multiple assets
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed for 2 bundles with multiple assets

  @LW-3263
  Scenario: Extended-view - reuse new address in bundle outputs
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click "Add address" button 1 in address bar
    Then I see Add new address form in Send flow
    And Address field has filled "shelley" address
    When I fill "WalletName" name for address details in drawer
    And I click "Done" button on "Add address" drawer
    Then the "ADA" asset is displayed in bundle 1
    When I enter a value of: 1 to the "ADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And click "Add address" button 2 in address bar
    And I click address on the list with name "WalletName"
    And I enter a value of: 1 to the "ADA" asset in bundle 2
    Then the "ADA" asset is displayed in bundle 2
    And "Review transaction" button is enabled on "Send" page

  @LW-3264
  Scenario: Extended-view - remove address from bundle outputs
    Given I have 3 addresses in my address book in extended mode
    When I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button 1 in address bar
    And I click address on the list with name "Shelley"
    And I click "Add bundle" button on "Send" page
    And click "Add address" button 2 in address bar
    And I click address on the list with name "Shelley"
    And click "Remove address" button 1 in address bar
    Then address input 1 is empty
    When click "Remove address" button 2 in address bar
    Then address input 2 is empty

  @LW-3265
  Scenario: Extended-view - use new invalid address in bundle outputs
    Given I click "Send" button on page header
    And I enter an address 1 that matches the amount of characters but does not match with the checksum
    When I click "Add bundle" button on "Send" page
    And I enter an address 2 that matches the amount of characters but does not match with the checksum
    Then An Incorrect address 1 error is displayed
    And An Incorrect address 2 error is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-3562
  Scenario Outline: Extended-view - Verify token / nft section existence and content - <bundle_number>
    Given I click "Send" button on page header
    And I see 1 bundle rows
    When I click "Add bundle" button on "Send" page
    And I click "Add bundle" button on "Send" page
    And I see 3 bundle rows
    And I click "Add token or NFT" button for bundle <bundle_number>
    Then coin selector contains two tabs: tokens & nfts
    Examples:
      | bundle_number |
      | 1             |
      | 2             |
      | 3             |

  @LW-3564
  Scenario: Extended-view - Check tx fee and ADA allocation for multi asset tx
    Given I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    When I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And click on the coin selector for "ADA" asset in bundle 2
    And click on an token with name: "HOSKY Token"
    And I enter a value of: 1 to the "HOSKY" asset in bundle 2
    Then transaction fee is around 0.18 ADA and Ada allocation cost is around 1.07 ADA

  @LW-4505
  Scenario: Extended-view - Cancel transaction with multiple bundles on Summary page
    Given I click "Send" button on page header
    When I set 2 bundles with multiple assets
    And I click "Review transaction" button on "Send" page
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-3580
  Scenario: Extended-view - Cancel transaction with multiple bundles on Password page
    Given I click "Send" button on page header
    When I set 2 bundles with multiple assets
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    Then Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-3560 @Pending
  # bug: LW-4698
  Scenario: Extended View - Validation of insufficient balance error
    When I save token: "Cardano" balance in extended mode
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a 51% of total "ADA" asset in bundle 1
    Then I do not see insufficient balance error in bundle 1 for "ADA" asset
    And "Review transaction" button is enabled on "Send" page
    When I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And I enter a 51% of total "ADA" asset in bundle 2
    Then I see insufficient balance error in bundle 2 for "ADA" asset
    And I see insufficient balance error in bundle 1 for "ADA" asset
    And "Review transaction" button is disabled on "Send" page

  @LW-4686 @Pending
  # FIXME: LW-6715
  Scenario: Extended View - Validation of insufficient balance error when assets value is equal to 0
    When I save token: "Cardano" balance in extended mode
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a 101% of total "ADA" asset in bundle 1
    Then I see insufficient balance error in bundle 1 for "ADA" asset
    And "Review transaction" button is disabled on "Send" page
    When I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And I enter a value of: 0  to the "ADA" asset in bundle 2
    Then I do not see insufficient balance error in bundle 2 for "ADA" asset
    And I see insufficient balance error in bundle 1 for "ADA" asset
    And "Review transaction" button is disabled on "Send" page

  @LW-1762
  Scenario: Extended view: Send - Token can be added once for each bundle
    When I click "Send" button on page header
    And I click "Add bundle" button on "Send" page
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click "Add token or NFT" button for bundle 1
    And Token with name: "HOSKY Token" is not displayed in coin selector
    And I close the drawer by clicking back button
    And I click "Add token or NFT" button for bundle 2
    Then Token with name: "HOSKY Token" is displayed in coin selector

  @LW-4731
  Scenario: Extended view: Send - NFT can be added once for each bundle
    When I click "Send" button on page header
    And I click "Add bundle" button on "Send" page
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin"
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I close the drawer by clicking back button
    And I click "Add token or NFT" button for bundle 2
    And click on the NFTs button in the coin selector dropdown
    Then NFT with name: "Ibilecoin" is displayed in coin selector

  @LW-3748
  Scenario: Extended-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And I click MAX button in bundle 1 for "SUNDAE" asset
    Then the maximum available amount is displayed in bundle: 1 for "SUNDAE" asset

  @LW-3747
  Scenario: Extended-view - send maximum amount of multiple assets by clicking MAX button
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And I click MAX button in bundle 1 for "SUNDAE" asset
    Then the maximum available amount is displayed in bundle: 1 for "SUNDAE" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click MAX button in bundle 1 for "HOSKY" asset
    Then the maximum available amount is displayed in bundle: 1 for "HOSKY" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin"
    And I click MAX button in bundle 1 for "Ibilecoin" asset
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin"
    And I click MAX button in bundle 1 for "Bison Coin" asset
    Then the maximum available amount is displayed in bundle: 1 for "Bison Coin" asset
    And "Review transaction" button is enabled on "Send" page

  @LW-3749
  Scenario: Extended-view - When adding MAX amount of a token, it isn't displayed in next bundle
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "ADA" asset
    And I click "Add bundle" button on "Send" page
    Then the "ADA" asset is not displayed in bundle 2
    When I click "Add token or NFT" button for bundle 2
    Then the asset "ADA" is not displayed in the token list

  @LW-1605 @LW-1606 @Pending
  #bug LW-5065
  Scenario: "Insufficient funds" error for extended view & advanced tx type - summing values for multiple assets
    And I save token: "Cardano" balance in extended mode
    And I save token: "HOSKY Token" balance in extended mode
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a 51% of total "ADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And I click "Add token or NFT" button for bundle 2
    And click on an token with name: "HOSKY Token"
    And I enter a 55% of total "ADA" asset in bundle 2
    And I enter a 51% of total "SUNDAE" asset in bundle 2
    Then I see insufficient balance error in bundle 1 for "ADA" asset
    And I see insufficient balance error in bundle 1 for "ADA" asset
    And I do not see insufficient balance error in bundle 2 for "SUNDAE" asset
    And "Review transaction" button is disabled on "Send" page
