@SharedWalletOnboarding-Extended @Testnet
Feature: Shared wallet - onboarding

  Background:
    Given Lace is ready for test

  @LW-11818
  Scenario: Shared wallets - Clicking shared wallet menu option for the first time
    Given I do not have previously generated shared wallet key
    When I open header menu
    When I click on 'Add shared wallet' option
    Then I see shared wallets onboarding screen before generating key
    And 'Generate wallet key' option is active
    And 'New Shared wallet' option is not active
    And 'Import shared wallet' option is not active

  @LW-11819
  Scenario: Shared wallets - Clicking shared wallet menu option for the first time
    Given I do not have previously generated shared wallet key
    When I open header menu
    When I click on 'Add shared wallet' option
    And I click on 'Generate' button on shared wallets onboarding screen
    Then I see 'Generate shared wallet key' screen
    When I enter valid password on 'Generate shared wallet key' screen
    And I click on 'Generate key' button on 'Generate shared wallet key' screen
    Then I see 'Copy shared wallet key' screen
    When I save shared wallet key in test context
    And I click on 'Copy key to clipboard' button on 'Copy shared wallet key' screen
    Then I see a toast with text: 'Shared wallet key copied to clipboard'
    And shared wallet key is saved to clipboard
    And I click on 'Close' button on 'Copy shared wallet key' screen
    And I see shared wallets onboarding screen after generating key

  @LW-11820
  Scenario: Shared wallets - Clicking shared wallet menu option when the shared key has been previously generated
    Given I have previously generated shared wallet key
    When I open header menu
    And I click on 'Add shared wallet' option
    Then I see shared wallets onboarding screen after generating key
    And 'Shared wallet key' option is active
    And I click on 'Copy to clipboard' button on shared wallets onboarding screen
    And shared wallet key is saved to clipboard
    And 'New Shared wallet' option is active
    And 'Import shared wallet' option is active

  @LW-11821 @LW-11816 @LW-11817
  Scenario: Shared wallets - Create shared wallet
    Given I have previously generated shared wallet key
    When I open header menu
    And I click on 'Add shared wallet' option
    And I click on 'Create' button on shared wallets onboarding screen
    Then I see 'Let's create your new shared wallet' screen
    When I enter 'SW TEST 1' as a new shared wallet name
    And I click on 'Next' button on 'Let's create your new shared wallet' screen
    Then I see 'Add wallet co-signers' screen
    When I enter valid identifier for myself, co-signer identifiers and shared keys
    And I click on 'Next' button on 'Add wallet co-signers' screen
    Then I see 'Important information about shared wallets' modal
    When I click on checkbox on 'Important information about shared wallets' modal
    And I click on 'Continue' on 'Important information about shared wallets' modal
    Then I see 'Define wallet quorum' screen
    When I choose 'Some addresses must sign' option
    And I open cosigners selection dropdown
    And I select 2 cosigners
    And I click on 'Next' button on 'Define wallet quorum' screen
    Then I see 'Share wallet details' screen
    When I click on 'Download' button on 'Share wallet details' screen
    And I click on 'Open shared wallet' button on 'Share wallet details' screen
    Then shared wallet 'SW TEST 1' was loaded
    And I do not see 'Staking' section in side menu
    When I open header menu
    Then I do not see 'Nami mode' switch

  @LW-11822 @skip(browserName='firefox')
  #  The uploadFile command is not available in Firefox
  Scenario: Shared wallets - Import shared wallet
    Given I have previously generated shared wallet key
    When I open header menu
    And I click on 'Add shared wallet' option
    And I click on 'Import' button on shared wallets onboarding screen
    Then I see 'Let's find your shared wallet' screen
    And I upload a valid JSON file with shared wallet
    And I click on 'Open wallet' button on 'Let's find your shared wallet' screen
    Then shared wallet 'SW TEST 1' was loaded
