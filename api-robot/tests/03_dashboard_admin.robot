*** Settings ***
Documentation       FR-13 admin dashboard data through the API. The cases are the layer=api
...                 cases of e2e/automation/data/fr13_dashboard.json, each run through the
...                 flow its check names.

Resource            ../resources/api.resource

Suite Setup         Log In As Admin
Test Template       Dashboard Case Should Hold

Test Tags           fr13


*** Variables ***
&{CHECK_FLOWS}
...                     api_admin_orders_status=Admin List Should Answer Actor As Designed
...                     api_admin_users_status=Admin List Should Answer Actor As Designed
...                     api_status_write_refused=Status Write Should Be Refused
...                     api_payload_contract=Admin Order Payload Should Carry KPI Fields
...                     canceled_to_delivered_refused=Canceled Order Should Not Become Delivered
...                     api_self_role_escalation_refused=Self Promotion To Admin Should Be Refused
@{ORDER_STATUSES}       pending    confirmed    shipping    delivered    canceled


*** Test Cases ***
FR13-API-01 Admin Orders Without Token Are Refused
    [Documentation]    GET /api/admin/orders without a token answers 401. FR13-API-01, HW02
    ...    TC-02.
    [Tags]    regression
    FR13-API-01

FR13-API-02 Admin Orders With Malformed Token Are Refused
    [Documentation]    GET /api/admin/orders with a malformed token answers 401 or 403.
    ...    FR13-API-02, HW02 TC-03.
    [Tags]    regression
    FR13-API-02

FR13-API-03 Admin Orders With Non Admin Token Are Refused
    [Documentation]    GET /api/admin/orders with a valid non-admin token answers 401 or 403.
    ...    FR13-API-03, HW02 TC-04 BUG-08.
    [Tags]    regression    known-bug
    FR13-API-03

FR13-API-04 Admin Users With Non Admin Token Are Refused
    [Documentation]    GET /api/admin/users with a valid non-admin token answers 401 or 403.
    ...    FR13-API-04.
    [Tags]    regression    known-bug
    FR13-API-04

FR13-API-05 Admin Orders With Admin Token Are Served
    [Documentation]    GET /api/admin/orders with the admin token answers 200 with a list.
    ...    Control for FR13-API-01 to API-04. FR13-API-05.
    [Tags]    smoke
    FR13-API-05

FR13-API-11 Admin Users Without Token Are Refused
    [Documentation]    GET /api/admin/users without a token answers 401. FR13-API-11.
    [Tags]    regression
    FR13-API-11

FR13-API-06 Non Admin Cannot Write Order Status
    [Documentation]    PUT /api/admin/orders/:id/status with a non-admin token answers 401 or
    ...    403 and the order stays pending. FR13-API-06.
    [Tags]    regression    known-bug
    FR13-API-06

FR13-API-12 Anonymous Status Write Is Refused
    [Documentation]    PUT /api/admin/orders/:id/status without a token answers 401 and the
    ...    order stays pending. FR13-API-12.
    [Tags]    regression
    FR13-API-12

FR13-API-13 Malformed Token Status Write Is Refused
    [Documentation]    PUT /api/admin/orders/:id/status with a malformed token answers 401 or
    ...    403 and the order stays pending. FR13-API-13.
    [Tags]    regression
    FR13-API-13

FR13-API-08 Admin Order Payload Carries KPI Fields
    [Documentation]    The admin order list holds the seeded order with a numeric id, a finite
    ...    numeric total_amount and a known status. FR13-API-08, OQ-02 OQ-09.
    [Tags]    regression
    FR13-API-08

FR13-TC-13 Canceled Order Cannot Become Delivered
    [Documentation]    The admin moving a canceled order to delivered is refused with 400, 409
    ...    or 422. FR13-TC-13, HW02 TC-13.
    [Tags]    regression    known-bug
    FR13-TC-13

FR13-TC-19 User Cannot Grant Themselves Admin
    [Documentation]    PUT /api/users/me with role admin is refused with 400, 401 or 403 and
    ...    the role stays user. FR13-TC-19.
    [Tags]    regression    known-bug
    FR13-TC-19

FR13-API-07 Expired Token Is Refused By Admin Endpoint
    [Documentation]    GET /api/admin/orders with a correctly signed but expired token answers
    ...    401 or 403. FR13-API-07.
    [Tags]    regression    needs-jwt-secret
    FR13-API-07

FR13-API-09 Signed Token Without Role Cannot Read All Orders
    [Documentation]    GET /api/admin/orders with a correctly signed token that has no role
    ...    answers 401 or 403. FR13-API-09, BUG-08.
    [Tags]    regression    known-bug    needs-jwt-secret
    FR13-API-09

FR13-API-10 Admin Token For Nonexistent User Cannot Read All Orders
    [Documentation]    GET /api/admin/orders with an admin-role token for a user id that does
    ...    not exist answers 401 or 403. FR13-API-10.
    [Tags]    regression    known-bug    needs-jwt-secret
    FR13-API-10


*** Keywords ***
Dashboard Case Should Hold
    [Documentation]    Loads case ``tc_id`` and runs the flow named by its ``check``.
    [Arguments]    ${tc_id}
    ${case}=    Load Dashboard Case    ${tc_id}
    Run Keyword    ${CHECK_FLOWS}[${case}[check]]    ${case}

Admin List Should Answer Actor As Designed
    [Documentation]    Requests the admin order or user list as the case's actor and checks
    ...    the status. A positive case must also get a list back.
    [Arguments]    ${case}
    ${auth}=    Auth For Actor    ${case}[actor]
    IF    $case['check'] == 'api_admin_users_status'
        ${response}=    Get Admin Users As    ${auth}
        VAR    ${endpoint}=    admin users
    ELSE
        ${response}=    Get Admin Orders As    ${auth}
        VAR    ${endpoint}=    admin orders
    END
    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] ${endpoint} as ${case}[actor]
    IF    $case['type'] == 'positive' and not isinstance($response.json(), list)
        ${details}=    Describe Response    ${response}
        Fail    ${case}[tc_id] ${endpoint}: expected a list, got ${details}
    END

Status Write Should Be Refused
    [Documentation]    Tries to confirm another user's pending order as the case's actor. The
    ...    write must be refused and the order must stay pending.
    [Arguments]    ${case}
    ${owner_auth}=    Register And Log In New User
    ${order_id}=    Place Order As    ${owner_auth}    ${case}[seed_orders][0][amount]
    ${auth}=    Auth For Actor    ${case}[actor]
    ${response}=    Set Order Status As    ${auth}    ${order_id}    confirmed
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] status write as ${case}[actor]
    Order Should Hold Status    ${owner_auth}    ${order_id}    pending    ${case}[tc_id] read back

Admin Order Payload Should Carry KPI Fields
    [Documentation]    Seeds the case's order and checks its row in the admin order list has
    ...    the fields the revenue KPI reads, with the right types.
    [Arguments]    ${case}
    ${owner_auth}=    Register And Log In New User
    VAR    ${seed}=    ${case}[seed_orders][0]
    ${order_id}=    Place Order In Status    ${owner_auth}    ${seed}[final_status]    ${seed}[amount]
    ${response}=    Get Admin Orders As    ${ADMIN_AUTH}
    Status Should Be Among    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] admin orders
    ${order}=    Find Order    ${response.json()}    ${order_id}
    IF    $order is None
        Fail    ${case}[tc_id] payload: seeded order ${order_id} is missing from the admin order list
    END
    IF    not isinstance($order['id'], int)
        Fail    ${case}[tc_id] payload: id ${order}[id] is not a number
    END
    IF    not (isinstance($order['total_amount'], (int, float)) and math.isfinite($order['total_amount']))
        Fail    ${case}[tc_id] payload: total_amount ${order}[total_amount] is not a finite number
    END
    IF    $order['status'] not in $ORDER_STATUSES
        Fail    ${case}[tc_id] payload: status ${order}[status] is not one of ${ORDER_STATUSES}
    END

Canceled Order Should Not Become Delivered
    [Documentation]    Cancels a seeded order through the admin endpoint and then asks for
    ...    delivered, which must be refused.
    [Arguments]    ${case}
    ${owner_auth}=    Register And Log In New User
    ${order_id}=    Place Order In Status    ${owner_auth}    canceled    ${case}[seed_orders][0][amount]
    ${response}=    Set Order Status As    ${ADMIN_AUTH}    ${order_id}    delivered
    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] canceled to delivered

Self Promotion To Admin Should Be Refused
    [Documentation]    A user sends role admin to its own profile. The request must be refused
    ...    and the stored role must not become admin.
    [Arguments]    ${case}
    ${auth}=    Auth For Actor    ${case}[actor]
    VAR    &{profile}=    name=RF ${case}[tc_id]    role=admin
    ${response}=    Update Profile As    ${auth}    ${profile}
    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] self-promotion to admin
    ${me}=    Get Profile As    ${auth}
    Status Should Be    ${me}    200    ${case}[tc_id] read back profile
    ${role}=    Evaluate    $me.json().get('role')
    IF    $role == 'admin'
        Fail    ${case}[tc_id] read back: the account granted itself the admin role
    END
