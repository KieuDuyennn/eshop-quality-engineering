*** Settings ***
Documentation       FR-11 order history through the API. The FR11 cases are the channel=api
...                 cases of e2e/automation/data/fr11_order_history.json, each run through
...                 the flow its api_call names. The RF-ORD cases cover a plain cancel and
...                 a cancel by another user.

Library             Collections
Resource            ../resources/api.resource

Suite Setup         Log In As Admin
Test Template       Order History Case Should Hold

Test Tags           fr11


*** Variables ***
&{API_CALL_FLOWS}
...                     order_detail=Order Detail Should Be Answered As Designed
...                     admin_orders_list=Admin Order List Should Be Answered As Designed
...                     my_orders=My Orders Should Be Answered As Designed
...                     checkout=Checkout Should Be Answered As Designed
...                     admin_set_status=Status Change Should Be Answered As Designed
...                     order_cancel=Cancel Should Be Answered As Designed
...                     order_cancel_race=Concurrent Cancels Should Be Acknowledged Once


*** Test Cases ***
FR11-TC-03 Another Users Order Is Not Readable By ID
    [Documentation]    A user reading another user's order by id is refused with 401, 403
    ...    or 404. FR11-TC-03, HW02 TC-03.
    [Tags]    regression    known-bug
    FR11-TC-03

FR11-TC-15 Order Detail Without Token Is Refused
    [Documentation]    GET /api/orders/:id without a token is refused with 401 or 403.
    ...    FR11-TC-15, REQ-02.
    [Tags]    regression    known-bug
    FR11-TC-15

FR11-TC-06 Nonexistent Order Is Not Found
    [Documentation]    Order id 999999 answers 404. FR11-TC-06, HW02 TC-06.
    [Tags]    regression
    FR11-TC-06

FR11-TC-07 Malformed Order ID Returns No Order
    [Documentation]    Order id abc answers 400, 404 or 422. FR11-TC-07, OQ-12 OQ-13.
    [Tags]    regression
    FR11-TC-07

FR11-BVA-01 Order ID Below Lower Boundary Is Not Served
    [Documentation]    Order id -1 answers 400 or 404. FR11-BVA-01, OQ-17.
    [Tags]    regression
    FR11-BVA-01

FR11-BVA-02 Order ID Zero Is Not Served
    [Documentation]    Order id 0 answers 400 or 404. FR11-BVA-02.
    [Tags]    regression
    FR11-BVA-02

FR11-BVA-03 First Order ID Is Served
    [Documentation]    Order id 1 answers 200 once an order exists. FR11-BVA-03, OQ-16.
    [Tags]    smoke
    FR11-BVA-03

FR11-TC-18 Non Admin Cannot List Every Order
    [Documentation]    A non-admin token on GET /api/admin/orders is refused with 401 or 403.
    ...    FR11-TC-18.
    [Tags]    regression    known-bug
    FR11-TC-18

FR11-TC-43 Token For Nonexistent User Is Not A Session
    [Documentation]    A correctly signed token for a user id that does not exist is refused
    ...    by GET /api/orders/my-orders with 401 or 403. FR11-TC-43.
    [Tags]    regression    known-bug    needs-jwt-secret
    FR11-TC-43

FR11-TC-35 Checkout Rejects Non Numeric Total
    [Documentation]    POST /api/checkout with total_amount abc answers 400 or 422 and creates
    ...    no order. FR11-TC-35, diagnostic for TC-31 TC-33 TC-34.
    [Tags]    regression    known-bug
    FR11-TC-35

FR11-TC-19 Non Admin Cannot Change Order Status
    [Documentation]    A non-admin token on PUT /api/admin/orders/:id/status is refused with
    ...    401 or 403 and the status stays pending. FR11-TC-19.
    [Tags]    regression    known-bug
    FR11-TC-19

FR11-TC-22 Canceled Order Cannot Become Delivered
    [Documentation]    canceled to delivered answers 400 and the order stays canceled.
    ...    FR11-TC-22.
    [Tags]    regression    known-bug
    FR11-TC-22

FR11-TC-24 Transition Skipping The Chain Is Refused
    [Documentation]    pending to delivered answers 400 and the order stays pending. Control
    ...    for FR11-TC-22. FR11-TC-24.
    [Tags]    regression
    FR11-TC-24

FR11-TC-25 Unknown Status Value Is Refused
    [Documentation]    pending to hacked answers 400 and the order stays pending. FR11-TC-25,
    ...    HW02 EC-14.
    [Tags]    regression
    FR11-TC-25

FR11-TC-27 Shipping Order Cannot Be Canceled
    [Documentation]    The cancel endpoint refuses a shipping order with 400 and the order stays
    ...    shipping. FR11-TC-27.
    [Tags]    regression    known-bug
    FR11-TC-27

FR11-TC-28 Another Users Order Cannot Be Canceled
    [Documentation]    Cancelling another user's pending order answers 404 and the order stays
    ...    pending. Control for FR11-TC-03. FR11-TC-28.
    [Tags]    regression
    FR11-TC-28

FR11-TC-29 Canceled Order Cannot Be Canceled Again
    [Documentation]    Cancelling a canceled order answers 400. FR11-TC-29.
    [Tags]    regression
    FR11-TC-29

FR11-TC-30 Delivered Order Cannot Be Canceled
    [Documentation]    Cancelling a delivered order answers 400 and the order stays delivered.
    ...    FR11-TC-30.
    [Tags]    regression
    FR11-TC-30

FR11-TC-44 Cancel Without Token Is Refused
    [Documentation]    The cancel endpoint without a token answers 401 and the order stays
    ...    pending. FR11-TC-44.
    [Tags]    regression
    FR11-TC-44

FR11-TC-45 Concurrent Cancels Are Acknowledged Once
    [Documentation]    Simultaneous cancels of one pending order answer 200 exactly once and
    ...    400 for the rest, for each of the seeded orders. FR11-TC-45.
    [Tags]    regression    known-bug
    FR11-TC-45

RF-ORD-01 Owner Cancels A Pending Order
    [Documentation]    The owner cancels a pending order once: 200, and the order reads back
    ...    as canceled. New check, RF-ORD-01.
    [Tags]    smoke
    [Template]    NONE
    ${owner_auth}=    Register And Log In New User
    ${order_id}=    Place Order As    ${owner_auth}
    ${response}=    Cancel Order As    ${owner_auth}    ${order_id}
    Status Should Be    ${response}    200    RF-ORD-01 cancel
    Order Should Hold Status    ${owner_auth}    ${order_id}    canceled    RF-ORD-01 read back

RF-ORD-02 Other User Cannot Cancel An Order
    [Documentation]    User B cancelling user A's order answers 404 and the order stays
    ...    pending. New check, RF-ORD-02.
    [Tags]    regression
    [Template]    NONE
    ${user_a_auth}=    Register And Log In New User
    ${user_b_auth}=    Register And Log In New User
    ${order_id}=    Place Order As    ${user_a_auth}
    ${response}=    Cancel Order As    ${user_b_auth}    ${order_id}
    Status Should Be    ${response}    404    RF-ORD-02 cancel by another user
    Order Should Hold Status    ${user_a_auth}    ${order_id}    pending    RF-ORD-02 read back


*** Keywords ***
Order History Case Should Hold
    [Documentation]    Loads case ``tc_id``, creates its users and orders, and runs the flow
    ...    named by its ``api_call``.
    [Arguments]    ${tc_id}
    ${case}=    Load Order History Case    ${tc_id}
    ${context}=    Set Up Order History Case    ${case}
    Run Keyword    ${API_CALL_FLOWS}[${case}[api_call]]    ${case}    ${context}

Set Up Order History Case
    [Documentation]    Registers an owner and another user, seeds the orders the case lists and
    ...    returns them with the auth header of the identity in ``acting_as``.
    [Arguments]    ${case}
    ${owner_auth}=    Register And Log In New User
    ${other_auth}=    Register And Log In New User
    ${seed_specs}=    Evaluate    $case.get('seed_owner_orders', [])
    ${seeded_ids}=    Place Orders From Specs    ${owner_auth}    ${seed_specs}
    ${other_count}=    Evaluate    $case.get('seed_other_orders', 0)
    ${other_ids}=    Place Orders For Other User    ${other_auth}    ${other_count}
    ${auth}=    Auth For Actor    ${case}[acting_as]    ${owner_auth}    ${other_auth}
    # Not VAR &{context}: Robot copies nested dictionaries into plain DotDicts, and the
    # auth headers would then print their tokens in the log.
    ${context}=    Evaluate
    ...    dict(owner_auth=$owner_auth, other_auth=$other_auth, seeded_ids=$seeded_ids, other_ids=$other_ids)
    Set To Dictionary    ${context}    auth=${auth}
    RETURN    ${context}

Place Orders From Specs
    [Documentation]    Creates one order per ``{status, total_amount}`` spec for ``owner_auth``
    ...    and returns their ids. A spec without total_amount gets ``\${DEFAULT_ORDER_TOTAL}``.
    [Arguments]    ${owner_auth}    ${order_specs}
    VAR    @{order_ids}=    @{EMPTY}
    FOR    ${spec}    IN    @{order_specs}
        ${total_amount}=    Evaluate    $spec.get('total_amount', $DEFAULT_ORDER_TOTAL)
        ${order_id}=    Place Order In Status    ${owner_auth}    ${spec}[status]    ${total_amount}
        Append To List    ${order_ids}    ${order_id}
    END
    RETURN    ${order_ids}

Place Orders For Other User
    [Documentation]    Creates ``count`` pending orders for the other user and returns their ids.
    [Arguments]    ${other_auth}    ${count}
    VAR    @{order_ids}=    @{EMPTY}
    FOR    ${_}    IN RANGE    ${count}
        ${order_id}=    Place Order As    ${other_auth}    ${OTHER_USER_ORDER_TOTAL}
        Append To List    ${order_ids}    ${order_id}
    END
    RETURN    ${order_ids}

Refusal Is Expected
    [Documentation]    Returns ``True`` when 200 is not among the statuses ``case`` allows.
    [Arguments]    ${case}
    ${refusal}=    Evaluate    200 not in $case['expect_http_any_of']
    RETURN    ${refusal}

Order Detail Should Be Answered As Designed
    [Documentation]    Reads one order by id and checks the status. A refused read must not
    ...    return the order record either.
    [Arguments]    ${case}    ${context}
    IF    'detail_order_id' in $case
        VAR    ${order_id}=    ${case}[detail_order_id]
    ELSE IF    $case['detail_owned_by'] == 'other'
        VAR    ${order_id}=    ${context}[other_ids][0]
    ELSE
        VAR    ${order_id}=    ${context}[seeded_ids][0]
    END
    ${response}=    Get Order Detail As    ${context}[auth]    ${order_id}
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] order detail
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal} and $response.status_code == 200 and 'total_amount' in $response.json()
        Fail    ${case}[tc_id] order detail: the read should be refused, yet order ${order_id} was returned
    END

Admin Order List Should Be Answered As Designed
    [Documentation]    Lists every order through the admin endpoint and checks the status. A
    ...    refused list must not return other users' orders either.
    [Arguments]    ${case}    ${context}
    ${response}=    Get Admin Orders As    ${context}[auth]
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] admin order list
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal} and $response.status_code == 200
        ${leaked}=    Get Length    ${response.json()}
        IF    ${leaked} > 0
            Fail    ${case}[tc_id] admin order list: a non-admin account was served ${leaked} orders of other users
        END
    END

My Orders Should Be Answered As Designed
    [Documentation]    Reads the caller's own order list and checks the status. A refused
    ...    caller must not get a payload either.
    [Arguments]    ${case}    ${context}
    ${response}=    Get My Orders As    ${context}[auth]
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] my-orders
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal} and $response.status_code == 200
        Fail    ${case}[tc_id] my-orders: the refused caller still received an order list
    END

Checkout Should Be Answered As Designed
    [Documentation]    Checks out with the case's total as the owner and checks the status. A
    ...    refused checkout must not have created an order.
    [Arguments]    ${case}    ${context}
    ${response}=    Check Out As    ${context}[owner_auth]    ${case}[checkout_total_amount]
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] checkout
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal} and $response.status_code == 200
        VAR    ${created_id}=    ${response.json()}[orderId]
        ${orders}=    Get My Orders As    ${context}[owner_auth]
        ${created}=    Find Order    ${orders.json()}    ${created_id}
        IF    $created is not None
            Fail    ${case}[tc_id] checkout: total ${case}[checkout_total_amount] was stored as order ${created_id}
        END
    END

Status Change Should Be Answered As Designed
    [Documentation]    Sends the case's status change for the seeded order and checks the
    ...    status. A refused change must leave the order in ``transition_from``.
    [Arguments]    ${case}    ${context}
    VAR    ${order_id}=    ${context}[seeded_ids][0]
    ${response}=    Set Order Status As    ${context}[auth]    ${order_id}    ${case}[set_status]
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] set status
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal}
        Order Should Hold Status
        ...    ${context}[owner_auth]    ${order_id}    ${case}[transition_from]    ${case}[tc_id] read back
    END

Cancel Should Be Answered As Designed
    [Documentation]    Cancels the seeded order, or the other user's order, and checks the
    ...    status. A refused cancel must leave the order in ``cancel_target_status``, read
    ...    through the account that owns it.
    [Arguments]    ${case}    ${context}
    IF    $case['cancel_owned_by'] == 'other'
        VAR    ${order_id}=    ${context}[other_ids][0]
        VAR    ${order_owner_auth}=    ${context}[other_auth]
    ELSE
        VAR    ${order_id}=    ${context}[seeded_ids][0]
        VAR    ${order_owner_auth}=    ${context}[owner_auth]
    END
    ${response}=    Cancel Order As    ${context}[auth]    ${order_id}
    Run Keyword And Continue On Failure    Status Should Be Among
    ...    ${response}    ${case}[expect_http_any_of]    ${case}[tc_id] cancel
    ${refusal}=    Refusal Is Expected    ${case}
    IF    ${refusal}
        Order Should Hold Status
        ...    ${order_owner_auth}    ${order_id}    ${case}[cancel_target_status]    ${case}[tc_id] read back
    END

Concurrent Cancels Should Be Acknowledged Once
    [Documentation]    Races simultaneous cancels against each seeded order. Each race must
    ...    answer exactly ``expect_http_multiset`` and every order must end in
    ...    ``expect_final_status``.
    [Arguments]    ${case}    ${context}
    ${expected}=    Evaluate    sorted($case['expect_http_multiset'])
    ${wrong_races}=    Races Not Answered As Expected    ${context}[seeded_ids]    ${context}[auth]    ${expected}
    IF    $wrong_races
        ${races}=    Get Length    ${context}[seeded_ids]
        ${wrong}=    Get Length    ${wrong_races}
        ${listing}=    Evaluate    "; ".join($wrong_races)
        Run Keyword And Continue On Failure    Fail
        ...    ${case}[tc_id]: ${wrong} of ${races} races answered differently from ${expected}: ${listing}
    END
    FOR    ${order_id}    IN    @{context}[seeded_ids]
        Order Should Hold Status
        ...    ${context}[owner_auth]    ${order_id}    ${case}[expect_final_status]    ${case}[tc_id] final status
    END

Races Not Answered As Expected
    [Documentation]    Sends one race of simultaneous cancels per order and returns a line for
    ...    each race whose sorted statuses differ from ``expected``.
    [Arguments]    ${order_ids}    ${auth}    ${expected}
    ${requests_per_race}=    Get Length    ${expected}
    VAR    @{wrong_races}=    @{EMPTY}
    FOR    ${order_id}    IN    @{order_ids}
        ${statuses}=    Cancel Order Concurrently    ${order_id}    ${auth}    ${requests_per_race}
        ${answered}=    Evaluate    sorted($statuses)
        IF    $answered != $expected
            Append To List    ${wrong_races}    order ${order_id} answered ${answered}
        END
    END
    RETURN    ${wrong_races}
