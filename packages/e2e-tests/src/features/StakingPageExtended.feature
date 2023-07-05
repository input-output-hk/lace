@Staking-NonDelegatedFunds-Extended
Feature: Staking Page - Extended Browser View

  Background:
    Given Lace is ready for test

  @LW-2424 @Testnet @Mainnet
  Scenario: Extended View - Staking page is present with title and counter
    When I navigate to Staking extended page
    Then I see Staking title and counter with total number of pools displayed

  @LW-2425 @Testnet @Mainnet
  Scenario: Extended View - Network info component is present on the staking page with expected content
    When I navigate to Staking extended page
    Then I see the Network Info component with the expected content

  @LW-2486 @Testnet @Mainnet
  Scenario: Extended View - Staking search control is displayed with appropriate content
    When I navigate to Staking extended page
    Then I see the stake pool search control with appropriate content in extended mode

  @LW-2662 @Testnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I see the stake pool search control with appropriate content in extended mode
    And I input "<stake_pool_search_term>" to the search bar
    Then there are <number_of_results> results and "<stake_pool_title>" and "<stake_pool_subtitle>" are populated if applicable
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_title                 | stake_pool_subtitle |
      | a Capital              | 1                 | ADA Capital                      | ADACT               |
      | a capital              | 1                 | ADA Capital                      | ADACT               |
      | NED#                   | 0                 |                                  |                     |
      | PAN                    | 1                 | PANL Stake Pool (Pre-Production) | PANL                |
      | 123456                 | 0                 |                                  |                     |
      | AZ                     | 2                 | AzureADA                         | AZUR                |
      | £££                    | 0                 |                                  |                     |
      | Amso                   | 0                 |                                  |                     |

  @LW-2662 @Mainnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I see the stake pool search control with appropriate content in extended mode
    And I input "<stake_pool_search_term>" to the search bar
    Then there are <number_of_results> results and "<stake_pool_title>" and "<stake_pool_subtitle>" are populated if applicable
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_title | stake_pool_subtitle |
      | a Capital              | 1                 | ADA Capital      | ADACT               |
      | a capital              | 1                 | ADA Capital      | ADACT               |
      | NED#                   | 0                 |                  |                     |
      | PANL                   | 1                 | PANL Stake Pool  | PANL                |
      | 123456                 | 0                 |                  |                     |
      | DPo                    | 3                 | HKZDPool         | HKZD                |
      | £££                    | 0                 |                  |                     |
      | Amso                   | 0                 |                  |                     |

  @LW-2663 @Testnet @Mainnet
  Scenario: Extended View - Selecting stake pool from list opens drawer with appropriate details
    When I navigate to Staking extended page
    And I see the stake pool search control with appropriate content in extended mode
    And I input "Capital" to the search bar
    And I click stake pool with name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking

  @LW-4024 @Pending @Testnet @Mainnet
    #BUG input-output.atlassian.net/browse/ADP-2344
  Scenario: Extended View - Stake pool list default sorting by ROS
    When I navigate to Staking extended page
    And I reveal all stake pools
    Then the results are in descending order according to "ros" column

  @LW-2706 @Pending @Testnet @Mainnet
    #BUG input-output.atlassian.net/browse/ADP-2344
  Scenario Outline: Extended View - Sort lists ascending - column: <column>
    When I navigate to Staking extended page
    And I click on the "<column>" column header
    And I reveal all stake pools
    Then the results are in ascending order according to "<column>" column
    Examples:
      | column     |
      | name       |
      | ros        |
      | cost       |
      | saturation |

  @LW-2706 @Pending @Testnet @Mainnet
    #BUG input-output.atlassian.net/browse/ADP-2344
  Scenario Outline: Extended View - Sort lists descending - column <column>
    When I navigate to Staking extended page
    And I click on the "<column>" column header
    And I click on the "<column>" column header
    And I reveal all stake pools
    Then the results are in descending order according to "<column>" column
    Examples:
      | column     |
      | name       |
      | ros        |
      | cost       |
      | saturation |

  @LW-2490 @Testnet @Mainnet
  Scenario: Extended View - Stake pool list item
    When I navigate to Staking extended page
    Then Each stake pool list item contains:
      | stake pool logo          |
      | stake pool name + ticker |
      | ROS value                |
      | Cost (% + ADA)           |
      | Saturation               |

  @LW-1704 @Testnet @Mainnet
  Scenario: Extended View - "About staking" widget
    Given I am on Staking extended page
    Then I see "About staking" widget with all relevant items

  @LW-1705 @Testnet @Mainnet
  Scenario Outline: Extended-view - "About staking" widget item click - <subtitle>
    Given I am on Staking extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                          |
      | FAQ      | What are staking & delegation?    |
      | FAQ      | Which stake pool should I choose? |
      | Glossary | What is an active stake?          |
      | Video    | Staking made easy with Lace       |

  @LW-4559 @Testnet @Mainnet
  Scenario: Extended View - Staking - Close modal - Open stake pool
    Given I am on Staking extended page
    When I input "Capital" to the search bar
    And I click stake pool with name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
    When I close the drawer by clicking close button
    Then Staking exit modal is not displayed
    And Drawer is not displayed

  @LW-4560 @Testnet @Mainnet
  Scenario Outline: Extended View - Staking - Close modal - Staking confirmation step - <action>
    Given I am on Staking extended page
    When I input "Capital" to the search bar
    And I click stake pool with name "ADA Capital"
    And I click "Stake on this pool" button on stake pool details drawer
    And <step>
    Then Staking exit modal is displayed
    Examples:
      | action             | step                                        |
      | click close button | I close the drawer by clicking close button |
      | click outside      | I click outside the drawer                  |

  @LW-4561 @Testnet
  Scenario: Extended View - Staking - Close modal - Password input
    Given I am on Staking extended page
    When I input "Capital" to the search bar
    And I click stake pool with name "ADA Capital"
    And I click "Stake on this pool" button on stake pool details drawer
    And I click "Next" button on staking confirmation drawer
    Then Staking password screen is displayed
    When I close the drawer by clicking close button
    Then Staking exit modal is displayed
