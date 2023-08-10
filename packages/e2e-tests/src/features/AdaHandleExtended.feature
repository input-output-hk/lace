@AdaHandle-extended @Testnet
Feature: ADA handle - extended view

  @LW-7331
  Scenario: Extended view - Add a valid ADA handle to the address book
    Given I am on Address Book extended page
    And I click "Add address" button on address book page
    When I fill address form with "test_handle_1" name
    And I fill address form with "$test_handle_1" ADA handle
    Then Green tick icon is displayed next to ADA handle
    And "Save address" button is enabled on "Add new address" drawer
    When I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address row with name "test_handle_1" and address "$test_handle_1" on the list in extended mode

  @LW-7333
  Scenario: Extended view - Add an invalid ADA handle to the address book
    Given I am on Address Book extended page
    And I click "Add address" button on address book page
    When I fill address form with "ADA handle" name
    And I fill address form with "$fake_handle" ADA handle
    Then Red "X" icon is displayed next to ADA handle
    And "Handle not found" error is displayed
    And "Save address" button is disabled on "Add new address" drawer
