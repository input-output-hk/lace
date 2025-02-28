@AddressBook-popup @Analytics @Testnet @Mainnet
@SkipFirefox
Feature: Analytics - Posthog - Address book - Popup view

  Background:
    Given Wallet is synced

  @LW-8678
  Scenario: Analytics - Popup-view - Address Book - Add new address
    Given I don't have any addresses added to my address book in popup mode
    And I set up request interception for posthog analytics request(s)
    And I click "Add address" button on address book page
    Then I validate latest analytics single event "address book | add address | click"
    When I fill address form with "Shelley_manual" name and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    And I click "Save address" button on "Add new address" drawer
    Then I validate latest analytics single event "address book | add new address | save address | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8679
  Scenario: Analytics - Popup-view - Address Book - Add new address and Cancel
    Given I don't have any addresses added to my address book in popup mode
    And I set up request interception for posthog analytics request(s)
    And I click "Add address" button on address book page
    Then I validate latest analytics single event "address book | add address | click"
    And I click "Cancel" button on "Add new address" drawer
    Then I validate latest analytics single event "address book | add new address | cancel | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8680
  Scenario: Analytics - Popup-view - Address Book - Edit, Cancel edition, Cancel deletion and delete
    Given I have 3 addresses in my address book in popup mode
    And I set up request interception for posthog analytics request(s)
    When I click address on the list with name "Byron"
    Then I validate latest analytics single event "address book | address record | click"
    When I click "Copy" button on address details page
    Then I validate latest analytics single event "address book | address record | copy | click"
    And I click "Edit" button on address details page
    Then I validate latest analytics single event "address book | address record | edit | click"
    And I fill address form with "Byron_edited" name and "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" address
    And I click "Done" button on "Edit address" drawer
    Then I validate latest analytics single event "address book | address record | edit address | done | click"
    When I click address on the list with name "Byron_edited"
    Then I validate latest analytics single event "address book | address record | click"
    And I click "Edit" button on address details page
    Then I validate latest analytics single event "address book | address record | edit | click"
    And I click "Cancel" button on "Add new address" drawer
    Then I validate latest analytics single event "address book | address record | edit address | cancel | click"
    When I click "Delete" button on address details page
    Then I validate latest analytics single event "address book | address record | delete | click"
    And I click "Cancel" button on delete address modal
    Then I validate latest analytics single event "address book | address record | hold up! | cancel | click"
    When I click "Delete" button on address details page
    Then I validate latest analytics single event "address book | address record | delete | click"
    When I click "Delete address" button on delete address modal
    Then I validate latest analytics single event "address book | address record | hold up! | delete address | click"
    And I validate that 11 analytics event(s) have been sent
