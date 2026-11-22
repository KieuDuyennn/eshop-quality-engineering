*** Settings ***
Documentation       Checks that the backend serves its product list before the feature
...                 suites run.

Resource            ../resources/api.resource


*** Test Cases ***
RF-SMOKE-01 Product List Is Served
    [Documentation]    GET /api/products answers 200 with a non-empty list. New check, RF-SMOKE-01.
    [Tags]    smoke
    ${response}=    Get Products
    Status Should Be    ${response}    200    product list
    Should Not Be Empty    ${response.json()}    product list: expected at least one product, answered an empty list
