@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-5146 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - No search result for NFTs
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-5180 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <token> token
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    When I save ticker for the Token with name: <token>
    And click on an token with name: "<token>"
    Then the displayed ticker for Tokens has the correct amount of characters
    When I hover over the ticker for "<token>" asset in bundle 1
    Then I see a tooltip showing full name: "<token>" for Tokens
    Examples:
      | token     |
      | tHOSKY    |
      | LaceCoin3 |
      | LaceCoin  |
      | LaceCoin2 |

  @LW-5181 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <nft> NFT
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I save ticker for the NFT with name: <nft>
    And I click on NFT with name: "<nft>" in asset selector
    Then the displayed ticker for NFTs has the correct amount of characters
    When I hover over the ticker for "<nft>" asset in bundle 1
    Then I see a tooltip showing full name: "<nft>" for NFTs
    Examples:
      | nft                |
      | LaceNFT            |
      | Pixel NFT          |
      | Bored Ape          |
      | Single NFT Preprod |

  @LW-5183 @Testnet
  Scenario Outline: Popup View - Send flow - Values switched from <value> to <displayed_value> when building a transaction
    And I click "Send" button on Tokens page in popup mode
    When I enter a value of: <value_to_enter> to the "tADA" asset in bundle 1 without clearing input
    Then I see <displayed_value> as displayed value
    And I press keyboard Enter button
    Then the displayed value switches to: <conv_value>
    When I click on transaction drawer background to lose focus
    When I hover over the value for "tADA" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for Tokens
    Examples:
      | value_to_enter    | displayed_value        | conv_value | should_see_tooltip |
      | 100               | 100                    | 100.00     | do not see         |
      | 987654            | 987,654                | 987,654.00 | do not see         |
      | 1000000           | 1,000,000              | 1.00M      | see                |
      | 1234567           | 1,234,567              | 1.23M      | see                |
      | 12345678          | 12,345,678             | 12.34M     | see                |
      | 123456789         | 123,456,789            | 123.45M    | see                |
      | 1234567891        | 1,234,567,891          | 1.23B      | see                |
      | 12345678912       | 12,345,678,912         | 12.34B     | see                |
      | 123456789123      | 123,456,789,123        | 123.45B    | see                |
      | 1234567891234     | 1,234,567,891,234      | 1.23T      | see                |
      | 12345678912345    | 12,345,678,912,345     | 12.34T     | see                |
      | 123456789123456   | 123,456,789,123,456    | 123.45T    | see                |
      | 1234567891234567  | 1,234,567,891,234,567  | 1.23Q      | see                |
      | 12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | see                |

  @LW-4595 @Testnet
  Scenario: Popup view - Send - Different network address, mainnet address from testnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I enter a valid "mainnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-4595 @Mainnet
  Scenario: Popup view - Send - Different network address, testnet address from mainnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I enter a valid "testnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-3884 @Testnet @Mainnet
  Scenario: Extended View - Value can be altered from 1 when an NFT is added to a send transaction
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1
    When I enter a value of: 1 to the "Ibilecoin" asset in bundle 1
    Then the NFT displays 1 in the value field
    And "Review transaction" button is enabled on "Send" page

  @LW-2408 @Testnet
  Scenario: Popup-view - Transaction error screen displayed on transaction submit error
    Given I enable network interception to fail request: "*/tx-submit/submit" with error 400
    And I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    When I enter correct password and confirm the transaction
    Then The Transaction error screen is displayed in popup mode

  @LW-7826 @Testnet @Pending
  @issue=LW-8579
  Scenario: Popup view - Validate if contact name that has up to 12 characters is not truncated
    Given address book contains address with name that has 12 characters
    When I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And I enter "abcdefghijkl" in the bundle 1 recipient's address
    Then first result in address dropdown has name "abcdefghijkl"
    When I click on one of the contacts on the dropdown
    Then recipients address input contains address entry with name "abcdefghijkl"

  @LW-7827 @Testnet @Pending
  @issue=LW-8579
  Scenario: Popup view - Validate if contact name that has >12 characters is truncated
    Given address book contains address with name that has more than 12 characters
    When I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And I enter "abcdefghijklm" in the bundle 1 recipient's address
    Then first result in address dropdown has name "abcdefghi..."
    When I click on one of the contacts on the dropdown
    Then recipients address input contains address entry with name "abcdefghi..."
