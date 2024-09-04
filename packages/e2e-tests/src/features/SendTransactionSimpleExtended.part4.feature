@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-5184 @Testnet
  Scenario Outline: Extended View - Send flow - Values switched from <value_to_enter> to <displayed_value> when building a transaction
    And I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    And click on an token with name: "tHOSKY"
    When I enter a value of: <value_to_enter> to the "tHOSKY" asset in bundle 1 without clearing input
    Then I see <displayed_value> as displayed value
    And <action>
    Then I see <conv_value> as displayed value
    When I hover over the value for "tHOSKY" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for Tokens
    Examples:
      | value_to_enter    | displayed_value        | conv_value | action                                  | should_see_tooltip |
      | 100               | 100                    | 100.00     | I click to loose focus from value field | do not see         |
      | 987654            | 987,654                | 987,654.00 | I press keyboard Enter button           | do not see         |
      | 1000000           | 1,000,000              | 1.00M      | I click to loose focus from value field | see                |
      | 1234567           | 1,234,567              | 1.23M      | I click to loose focus from value field | see                |
      | 12345678          | 12,345,678             | 12.34M     | I click to loose focus from value field | see                |
      | 123456789         | 123,456,789            | 123.45M    | I click to loose focus from value field | see                |
      | 1234567891        | 1,234,567,891          | 1.23B      | I click to loose focus from value field | see                |
      | 12345678912       | 12,345,678,912         | 12.34B     | I click to loose focus from value field | see                |
      | 123456789123      | 123,456,789,123        | 123.45B    | I click to loose focus from value field | see                |
      | 1234567891234     | 1,234,567,891,234      | 1.23T      | I click to loose focus from value field | see                |
      | 12345678912345    | 12,345,678,912,345     | 12.34T     | I click to loose focus from value field | see                |
      | 123456789123456   | 123,456,789,123,456    | 123.45T    | I click to loose focus from value field | see                |
      | 1234567891234567  | 1,234,567,891,234,567  | 1.23Q      | I click to loose focus from value field | see                |
      | 12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | I click to loose focus from value field | see                |

  @LW-3883 @Testnet @Mainnet
  Scenario: Extended View - Value can be altered from 1 when an NFT is added to a send transaction
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1
    When I enter a value of: 1 to the "Ibilecoin" asset in bundle 1
    Then I see 1.00 as displayed value
    And "Review transaction" button is enabled on "Send" page

  @LW-2374 @Testnet
  Scenario: Extended-view - Transaction error screen displayed on transaction submit error
    Given I enable network interception to finish request: "*/tx-submit/submit" with error 400
    And I click "Send" button on page header
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    When I enter correct password and confirm the transaction
    Then The Transaction error screen is displayed in extended mode

  @LW-7824 @Testnet @Pending
  @issue=LW-8579
  Scenario: Extended view - Validate if contact name that has up to 12 characters is not truncated
    Given address book contains address with name that has 12 characters
    When I click "Send" button on page header
    And I enter "abcdefghijkl" in the bundle 1 recipient's address
    Then first result in address dropdown has name "abcdefghijkl"
    When I click on one of the contacts on the dropdown
    Then recipients address input contains address entry with name "abcdefghijkl"

  @LW-7825 @Testnet @Pending
  @issue=LW-8579
  Scenario: Extended view - Validate if contact name that has >12 characters is truncated
    Given address book contains address with name that has more than 12 characters
    When I click "Send" button on page header
    And I enter "abcdefghijklm" in the bundle 1 recipient's address
    Then first result in address dropdown has name "abcdefghi..."
    When I click on one of the contacts on the dropdown
    Then recipients address input contains address entry with name "abcdefghi..."
