@DAppExplorer-Extended @Testnet

Feature: DApp Explorer - extended view

  Background:
    Given Wallet is synced

  @LW-12105
  Scenario: Extended View - DApp Explorer - open
    When I navigate to DApps extended page
    Then I see DApp Explorer page
    And I see the list of categories on DApp Explorer page
    And I see cards with DApps on DApp Explorer page
    When I hover over info icon on DApp Explorer page
    Then I see a tooltip with information about DApp Explorer

  @LW-12108
  Scenario Outline: Extended View - DApp Explorer - filter by category
    When I navigate to DApps extended page
    And I click on "<category>" DApp category
    Then DApps page label matches selected "<category>" category
    Then only DApps matching "<category>" are displayed
    Examples:
      | category     |
      | Games        |
      | Defi         |
      | Collectibles |
      | Marketplaces |
      | Exchanges    |
      | Social       |
      | Other        |
      | Show All     |

  @LW-12320
  Scenario: Extended View - "No DApps available" when no connection with DApp Radar
    When I am in the offline network mode
    And I navigate to DApps extended page
    Then "No DApps available" message is displayed
