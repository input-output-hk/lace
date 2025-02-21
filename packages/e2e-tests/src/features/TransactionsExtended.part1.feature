@Transactions-Extended
Feature: Transactions - Extended view

  Background:
    Given Wallet is synced

  @LW-2551 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Activity page
    When I navigate to Activity extended page
    Then Activity page is displayed

  @LW-2556 @LW-2555 @Testnet
  Scenario: Extended View - Activity page - transactions are loaded and skeleton disappears
    When I navigate to Activity extended page
    And Activity page is displayed
    And I save number of visible rows
    And I scroll to the last row
    And a skeleton is not displayed at the bottom of the page
    And more transactions are loaded

  @LW-2253 @Testnet @Mainnet
  Scenario: Extended View - Activity page - No value is zero
    When I navigate to Activity extended page
    Then all the transactions have a value other than zero

  @LW-2554 @Testnet
  Scenario: Extended View - Infinite scroll
    When I navigate to Activity extended page
    And Activity page is displayed
    And I save number of visible rows
    And I scroll to the last visible row on Activity page
    Then a skeleton is displayed at the bottom of the page

  @LW-2557 @Testnet
  Scenario: Extended View - Transactions are grouped
    When I navigate to Activity extended page
    Then all transactions are grouped by date

  @LW-2558 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Transactions show relevant info
    When I navigate to Activity extended page
    Then all transactions have icon, type of transaction, amount of tokens, value, and value in FIAT

  @LW-2559 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Folded
    Given I am on the Activity page - extended view
    When click on a transaction
    Then a side drawer is displayed showing the following information in extended mode
      | Title                   |
      | Tx Hash                 |
      | Status                  |
      | Timestamp               |
      | Folded input section    |
      | Folded output section   |
      | Transaction fee in ADA  |
      | Transaction fee in FIAT |

  @LW-2560 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Unfolded
    Given I am on the Activity page - extended view
    When I click on a transaction and click on both dropdowns
    Then all inputs and outputs of the transactions are displayed in extended mode

  @LW-2561 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - No value is zero
    Given I am on the Activity page - extended view
    When I click on a transaction and click on both dropdowns
    Then none of the input and output values is zero in extended mode

  @LW-2562 @Testnet @Mainnet
  Scenario: Extended View - Transactions section - Educational banner
    When I navigate to Activity extended page
    Then I see Activity "Learn about" widget with all relevant items

  @LW-2562 @Testnet @Mainnet
  Scenario Outline: Extended View - "Learn about" widget item click - <subtitle>
    Given I navigate to Activity extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                            |
      | Glossary | What are activity details?          |
      | Glossary | What is an unconfirmed transaction? |
      | FAQ      | Does Lace have fees?                |
      | Video    | Transaction bundles                 |

  @LW-3648 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Summary section is displayed
    Given I am on the Activity page - extended view
    When click on a transaction
    Then the amounts sent or received are displayed below the Tx hash in extended mode
    And the Sender or Receiver is displayed
