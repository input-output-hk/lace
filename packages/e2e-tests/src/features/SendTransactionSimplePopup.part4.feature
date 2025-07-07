@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-5181 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <nft> NFT
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I save ticker for the NFT with name: <nft>
    And I click on NFT with name: "<nft>"
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
  Scenario Outline: Popup View - Send flow - Values switched from <value_to_enter> to <displayed_value> when building a transaction
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the <assetType> button in the coin selector dropdown
    And <assetSelectionAction> "<assetName>"
    And I enter an exact value of: <value_to_enter> to the "<assetName>" asset in bundle 1
    Then I see <displayed_value> as displayed value
    When I click to lose focus from value field
    Then I see <conv_value> as displayed value
    And I <shouldSeeError> insufficient balance error in bundle 1 for "<assetName>" asset
    When I hover over the value for "<assetName>" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for <assetType>
    Examples:
      | value_to_enter      | displayed_value        | conv_value | assetType | assetName | assetSelectionAction         | shouldSeeError | should_see_tooltip |
      | 100                 | 100                    | 100.00     | Tokens    | tHOSKY    | click on an token with name: | do not see     | do not see         |
      | 1000000             | 1,000,000              | 1.00M      | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 1234567             | 1,234,567              | 1.23M      | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 12345678            | 12,345,678             | 12.34M     | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 123456789           | 123,456,789            | 123.45M    | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 1234567891          | 1,234,567,891          | 1.23B      | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 12345678912         | 12,345,678,912         | 12.34B     | Tokens    | tHOSKY    | click on an token with name: | do not see     | see                |
      | 123456789123        | 123,456,789,123        | 123.45B    | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 1234567891234       | 1,234,567,891,234      | 1.23T      | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 12345678912345      | 12,345,678,912,345     | 12.34T     | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 123456789123456     | 123,456,789,123,456    | 123.45T    | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 1234567891234567    | 1,234,567,891,234,567  | 1.23Q      | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 12345678912345678   | 12,345,678,912,345,678 | 12.34Q     | Tokens    | tHOSKY    | click on an token with name: | see            | see                |
      | 0.5                 | 5                      | 5.00       | Tokens    | tHOSKY    | click on an token with name: | do not see     | do not see         |
      | 0,5                 | 5                      | 5.00       | Tokens    | tHOSKY    | click on an token with name: | do not see     | do not see         |
      | 0,1%&               | 1                      | 1.00       | NFTs      | HUSKY     | I click on NFT with name:    | do not see     | do not see         |
      | 0,2                 | 2                      | 2.00       | NFTs      | HUSKY     | I click on NFT with name:    | see            | do not see         |
      | 0,1                 | 1                      | 1.00       | NFTs      | HUSKY     | I click on NFT with name:    | do not see     | do not see         |
      | 0,123456789         | 123,456,789            | 123.45M    | Tokens    | LaceCoin3 | click on an token with name: | see            | see                |
      | 0,123456789123      | 123,456,789,123        | 123.45B    | Tokens    | LaceCoin3 | click on an token with name: | see            | see                |
      | 0,123456789123456   | 123,456,789,123,456    | 123.45T    | Tokens    | LaceCoin3 | click on an token with name: | see            | see                |
      | 0,12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | Tokens    | LaceCoin3 | click on an token with name: | see            | see                |
      | 0,12                | 12                     | 12.00      | Tokens    | LaceCoin3 | click on an token with name: | do not see     | do not see         |
      | 0.1                 | 0.1                    | 0.10       | Tokens    | LaceCoin3 | click on an token with name: | do not see     | do not see         |
      | 1ss    .12aa34d$5   | 1.1234                 | 1.12       | Tokens    | LaceCoin3 | click on an token with name: | do not see     | see                |
      | 0.12345             | 0.1234                 | 0.12       | Tokens    | LaceCoin3 | click on an token with name: | do not see     | see                |
      | 0.000               | 0.000                  | 0.00       | Tokens    | LaceCoin3 | click on an token with name: | do not see     | do not see         |
      | 0                   | 0                      | 0.00       | Tokens    | LaceCoin3 | click on an token with name: | do not see     | do not see         |

  @LW-5183 @Mainnet
  Scenario Outline: Popup View - Send flow - Values switched from <value_to_enter> to <displayed_value> when building a transaction
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "ADA" asset in bundle 1
    And click on the <assetType> button in the coin selector dropdown
    And <assetSelectionAction> "<assetName>"
    And I enter an exact value of: <value_to_enter> to the "<assetName>" asset in bundle 1
    Then I see <displayed_value> as displayed value
    When I click to lose focus from value field
    Then I see <conv_value> as displayed value
    And I <shouldSeeError> insufficient balance error in bundle 1 for "<assetName>" asset
    When I hover over the value for "<assetName>" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for <assetType>
    Examples:
      | value_to_enter      | displayed_value        | conv_value | assetType | assetName  | assetSelectionAction         | shouldSeeError | should_see_tooltip |
      | 100                 | 100                    | 100.00     | Tokens    | Ibilecoin  | click on an token with name: | do not see     | do not see         |
      | 1000000             | 1,000,000              | 1.00M      | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 1234567             | 1,234,567              | 1.23M      | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 12345678            | 12,345,678             | 12.34M     | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 123456789           | 123,456,789            | 123.45M    | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 1234567891          | 1,234,567,891          | 1.23B      | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 12345678912         | 12,345,678,912         | 12.34B     | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 123456789123        | 123,456,789,123        | 123.45B    | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 1234567891234       | 1,234,567,891,234      | 1.23T      | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 12345678912345      | 12,345,678,912,345     | 12.34T     | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 123456789123456     | 123,456,789,123,456    | 123.45T    | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 1234567891234567    | 1,234,567,891,234,567  | 1.23Q      | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 12345678912345678   | 12,345,678,912,345,678 | 12.34Q     | Tokens    | Ibilecoin  | click on an token with name: | see            | see                |
      | 0.5                 | 5                      | 5.00       | Tokens    | Ibilecoin  | click on an token with name: | do not see     | do not see         |
      | 0,5                 | 5                      | 5.00       | Tokens    | Ibilecoin  | click on an token with name: | do not see     | do not see         |
      | 0,1%&               | 1                      | 1.00       | NFTs      | Bison Coin | I click on NFT with name:    | do not see     | do not see         |
      | 0,2                 | 2                      | 2.00       | NFTs      | Bison Coin | I click on NFT with name:    | see            | do not see         |
      | 0,1                 | 1                      | 1.00       | NFTs      | Bison Coin | I click on NFT with name:    | do not see     | do not see         |
      | 0,123456789         | 123,456,789            | 123.45M    | Tokens    | SUNDAE     | click on an token with name: | see            | see                |
      | 0,123456789123      | 123,456,789,123        | 123.45B    | Tokens    | SUNDAE     | click on an token with name: | see            | see                |
      | 0,123456789123456   | 123,456,789,123,456    | 123.45T    | Tokens    | SUNDAE     | click on an token with name: | see            | see                |
#      ToDo: unblock once LW-11465 is resolved
#      | 0,12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | Tokens    | SUNDAE     | click on an token with name: | see            | see                |
      | 0,12                | 12                     | 12.00      | Tokens    | SUNDAE     | click on an token with name: | see            | do not see         |
      | 0.1                 | 0.1                    | 0.10       | Tokens    | SUNDAE     | click on an token with name: | do not see     | do not see         |
      | 0ss    .12aa34d$567 | 0.123456               | 0.12       | Tokens    | SUNDAE     | click on an token with name: | do not see     | see                |
      | 0.1234567           | 0.123456               | 0.12       | Tokens    | SUNDAE     | click on an token with name: | do not see     | see                |
      | 0.000               | 0.000                  | 0.00       | Tokens    | SUNDAE     | click on an token with name: | do not see     | do not see         |
      | 0                   | 0                      | 0.00       | Tokens    | SUNDAE     | click on an token with name: | do not see     | do not see         |

  @LW-11468 @Testnet @Mainnet
  Scenario: Popup View - Send flow - Use Enter key to confirm asset input
    When I click "Send" button on Tokens page in popup mode
    And I enter a value of: 987654 to the "tADA" asset in bundle 1 without clearing input
    And I see 987,654 as displayed value
    When I press keyboard Enter button
    Then I see 987,654.00 as displayed value

  @LW-11469 @Testnet @Mainnet
  Scenario: Popup View - Send flow - Empty asset input handled correctly
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on an token with name: "Ibilecoin"
    And I click to lose focus from value field
    Then I see 0.00 as displayed value
    And I do not see insufficient balance error in bundle 1 for "Ibilecoin" asset
    When I hover over the value for "Ibilecoin" asset in bundle 1
    Then I see a tooltip showing full value: "0" for Tokens

  @LW-2408 @Testnet
  @Pending # due to issues with Fetch.enable
  Scenario: Popup-view - Transaction error screen displayed on transaction submit error
    Given I enable network interception to finish request: "*/tx-submit/submit" with error 400
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
