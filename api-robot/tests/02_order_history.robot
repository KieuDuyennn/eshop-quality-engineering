*** Settings ***
Documentation       FR-11 order history through the API. The FR11 cases are the channel=api
...                 cases of e2e/automation/data/fr11_order_history.json, each run through
...                 the flow its api_call names.

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
