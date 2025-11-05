@NotificationCenter-Extended @Testnet

Feature: Notification Center - extended view

  Background:
    Given Wallet is synced
    And I inject the notification center script into browser
    And I initialize notification center with test topics and notifications

  @LW-tbd1
  Scenario: Extended View - Notification Center - Notifications button in user menu is displayed with unread counter
    And "Notifications" button indicates 2 unread notifications
    When I add a new notification dynamically
    Then "Notifications" button indicates 3 unread notifications

  @LW-tbd2
  Scenario: Extended View - Notification Center - Notifications list in user menu is displayed and contains test notifications
    And I add a new notification dynamically
    When I click "Notifications" button on page header
    Then the dynamically added notification is displayed in the "Notifications menu" with unread marker
    And "Notifications menu" is displayed with some unread messages
    And "Notifications menu" contains 3 unread notifications with all details

  @LW-tbd3
  Scenario: Extended View - Notification Center - is displayed and contains test notifications - "View all" button click
    When I add a new notification dynamically
    And I click "Notifications" button on page header
    When I click on "View all" button in the "Notifications menu"
    Then "Notification center" is displayed in extended mode
    And "Notifications page" contains 3 unread notifications with all details
    And the dynamically added notification is displayed in the "Notifications center" with unread marker

  @LW-tbd4
  Scenario Outline: Extended View - Notification Center - open single notification from <location> - mark as read
    And I add a new notification dynamically
    And <navigation_step>
    When I click on notification number 1 in the "Notifications <location>"
    Then the dynamically added notification details are displayed in extended mode
    When I click on "View all" button in the Notification details view
    Then the dynamically added notification is displayed in the "Notifications center" with read marker
    When I click "Notifications" button on page header
    Then the dynamically added notification is displayed in the "Notifications menu" with read marker
    Examples:
      | location | navigation_step                               |
      | menu     | I click "Notifications" button on page header |
      | center   | I visit Notifications page in extended mode   |
