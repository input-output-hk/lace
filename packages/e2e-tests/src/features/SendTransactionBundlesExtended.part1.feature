@SendTx-Bundles-Extended @Testnet
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
    When I remove bundle 2
    Then I see 2 bundle rows

  @LW-4937
  Scenario: Extended View - Removing assets from multiple bundles Transaction + unable to remove all assets
    And I click "Send" button on page header
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    When I click "Add bundle" button on "Send" page
    And I click "Add token or NFT" button for bundle 2
    And click on an token with name: "LaceCoin"
    And click on the remove button for the "LaceCoin1" asset in bundle 2
    Then the "LaceCoin1" asset is not displayed in bundle 2
    Then the "tADA" asset does not contain remove button in bundle 2
    And the "LaceCoin1" asset is displayed in bundle 1

  @LW-2996
  Scenario: Extended-view - setting ada for multiple bundles
    When I click "Send" button on page header
    Then the "tADA" asset is displayed in bundle 1
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    Then the "tADA" asset is displayed in bundle 2
    When I enter a valid "shelley" address in the bundle 2 recipient's address
    And I enter a value of: 2 to the "tADA" asset in bundle 2
    Then "Review transaction" button is enabled on "Send" page

  @LW-2997 @LW-5061
  Scenario: Extended-view - setting ada + testcoin for each bundle, including decimal input
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin3"
    And I enter a value of: 0.2333 to the "LaceCoin3" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And I enter a valid "shelley" address in the bundle 2 recipient's address
    And click on the coin selector for "tADA" asset in bundle 2
    And click on an token with name: "LaceCoin"
    And I enter a value of: 1 to the "LaceCoin1" asset in bundle 2
    And I click "Add token or NFT" button for bundle 2
    And click on an token with name: "LaceCoin3"
    And I enter a value of: 0.8799 to the "LaceCoin3" asset in bundle 2
    Then "Review transaction" button is enabled on "Send" page

  @LW-2998
  Scenario: Extended-view - Tx summary page for two bundles
    Given I click "Send" button on page header
    When I set 2 bundles with multiple assets
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed for 2 bundles with multiple assets

  @LW-3190 @pending @issue=LW-13227
  Scenario: Extended-view - Byron address minimum amount for two bundles
    Given I click "Send" button on page header
    When I set multiple outputs for advanced transaction with less than minimum value for Byron address
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen for 2 bundles is displayed for Byron with minimum value

  @LW-3263
  Scenario: Extended-view - reuse new address in bundle outputs
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click "Add address" button inside address input 1
    Then I see "Add address" drawer in send flow in extended mode
    And address form is filled with "shelley" address
    When I fill address form with "WalletName" name
    And I click "Save" button on "Add address" drawer in send flow
    Then the "tADA" asset is displayed in bundle 1
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And click "Add address" button inside address input 2
    And I click address on the list with name "WalletName"
    And I enter a value of: 2 to the "tADA" asset in bundle 2
    Then the "tADA" asset is displayed in bundle 2
    And "Review transaction" button is enabled on "Send" page

  @LW-3264
  Scenario: Extended-view - remove address from bundle outputs
    Given I have 3 addresses in my address book in extended mode
    When I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button inside address input 1
    And I click address on the list with name "Shelley"
    And I click "Add bundle" button on "Send" page
    And click "Add address" button inside address input 2
    And I click address on the list with name "Shelley"
    And click "Remove address" button inside address input 1
    Then recipients address input 1 is empty
    When click "Remove address" button inside address input 2
    Then recipients address input 2 is empty

  @LW-3265
  Scenario: Extended-view - use new invalid address in bundle outputs
    Given I click "Send" button on page header
    And I enter an address that matches the amount of characters but does not match with the checksum into address input 1
    When I click "Add bundle" button on "Send" page
    And I enter an address that matches the amount of characters but does not match with the checksum into address input 2
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
