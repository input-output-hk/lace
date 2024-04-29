@Staking-DelegatedFunds-Extended @Testnet @Mainnet
Feature: Staking Page - Funds already delegated - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2642 @Smoke @Pending
  Scenario: Extended View - Staking  - Currently staking component
    When I navigate to Staking extended page
    Then I see currently staking component for stake pool: "ADA Ocean" in extended mode

  @LW-2643 @Smoke @Pending
  Scenario: Extended View - Staking - Details of currently staked pool
    And I navigate to Staking extended page
    When I click pool name in currently staking component
    Then I see drawer with "ADA Ocean" stake pool details

  @LW-4877
  Scenario: Extended View - Stake pool details - Enter and Escape buttons support
    Given I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "APEX" to the search bar
    And I click on the stake pool with ticker "APEX"
    Then Drawer is displayed
    When I press keyboard Enter button
    Then I see Changing Staking Preferences modal
    When I press keyboard Enter button
    Then I see Manage delegation drawer
    # When I press keyboard Enter button # TODO: update when LW-8625 is resolved
    # Next line in an override for LW-8625
    When I click "Confirm new portfolio" button
    Then I see Manage delegation drawer Confirmation page
    # When I press keyboard Escape button # TODO: update when LW-8623 is resolved
    # Then Staking exit modal is displayed
    # When I press keyboard Escape button
    Then I see Manage delegation drawer Confirmation page
    When I press keyboard Enter button
    Then staking password drawer is displayed
    When I press keyboard Escape button
    When I press keyboard Enter button
    Then Drawer is not displayed
