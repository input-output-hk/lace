@NamiMode-Extended @Testnet
Feature: Nami mode - extended view

  Background:
    Given Lace is ready for test

  @LW-12236
  Scenario: Extended view - Nami mode - 'You're about to activate Nami mode.' modal - click 'Back' button
    When I click the menu button
    And I click on 'Nami mode' switch
    Then 'You're about to activate Nami mode.' modal is displayed
    When I click 'Back' button on 'You're about to activate Nami mode.' modal
    Then 'You're about to activate Nami mode.' modal is not displayed
    And the user menu is displayed

  @LW-12238 @skip(browserName='firefox') @issue=LW-12397
  Scenario: Extended view - Nami mode - 'You're about to activate Nami mode.' modal - click 'Continue' button
    When I open empty tab
    And I switch to window with Lace
    When I click the menu button
    And I click on 'Nami mode' switch
    Then 'You're about to activate Nami mode.' modal is displayed
    When I click 'Continue' button on 'You're about to activate Nami mode.' modal
    Then Nami mode popup is displayed (MANUAL STEP)
    When I go to Nami mode
    Then Nami mode is enabled
    When I visit Tokens page in extended mode
    Then 'Legacy mode enabled' screen is displayed
