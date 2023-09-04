@MultidelegationDelegatedFunds-Extended @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2642 @Smoke
  Scenario: Extended View - Staking  - Currently staking component
    When I navigate to Staking extended page
    And I confirm multidelegation beta modal
    Then I see currently staking component for stake pool: "ADA Capital" in extended mode

  @LW-2643 @Smoke
  Scenario: Extended View - Staking - Details of currently staked pool
    And I navigate to Staking extended page
    And I confirm multidelegation beta modal
    When I click pool name in currently staking component
    Then I see multidelegation drawer with "ADA CAPITAL" stake pool details

  @LW-2644 @Pending
    #No tooltip currently. perhaps will be implemented in future
  Scenario Outline: Extended View - Staking - Hover over currently staking element: <element_to_hover>
    And I navigate to Staking extended page
    And I confirm multidelegation beta modal
    When I hover over <element_to_hover> in currently staking component
    Then I see tooltip for currently staking component
    Examples:
      | element_to_hover |
      | last reward      |
      | total staked     |
      | total rewards    |

  @LW-4877 @Pending
    #LW-7688 - Shortcuts Pending
  Scenario: Extended View - Stake pool details - Enter and Escape buttons support
    Given I am on Staking extended page
    And I confirm multidelegation beta modal
    And I click Browse pools tab
    And I input "Apex" to the search bar
    And I click stake pool with name "Apex Cardano Pool"
    Then Drawer is displayed
    When I press keyboard Enter button
    And I verify switching stake pools modal is displayed
    When I press keyboard Escape button
    And I verify switching stake pools modal is not displayed
    When I press keyboard Escape button
    And I click stake pool with name "Apex Cardano Pool"
    Then Drawer is displayed
    When I press keyboard Enter button
    And I verify switching stake pools modal is displayed
    When I press keyboard Enter button
    And I click "Next" button on staking manage staking
    Then An "staking.confirmation.title" text is displayed
    When I press keyboard Enter button
    Then An "browserView.transaction.send.enterWalletPasswordToConfirmTransaction" text is displayed
    When I press keyboard Escape button
    And I verify switching stake pools modal is not displayed

