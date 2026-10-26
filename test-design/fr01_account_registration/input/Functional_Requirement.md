# FR-01: Account Registration

> Pool A - Authentication, Categories, and Products.
> Source of truth: EShop System Requirements Specification (README.md, section 2, FR-01) - this document describes the *correct* business requirements. The real implementation may deviate; those deviations are the bugs to be found.

## 1. Overview

A new visitor can create an EShop account by providing personal details and a password. On successful registration, the account is created and the user is redirected to the Login page.

## 2. API Reference (from api_specification.md)

- **Endpoint:** `POST /api/register`
- **Request body (JSON):**
  ```json
  {
    "name": "Nguyen Van A",
    "email": "test@domain.com",
    "password": "Password123!"
  }
  ```
- **Success response (200 OK):** `{ "message": "User registered successfully", "id": <number> }`

## 3. Functional Requirements

### 3.1 Required input fields
- The user MUST provide all three of: **Full Name**, **Email**, **Password**.
- A **Confirm Password** field MUST also be present in the registration form (UI-level).

### 3.2 Email rules
- Email MUST be in a valid format (`user@domain.com`).
- Email MUST be unique across the system - a second registration with an already-registered email MUST be rejected.

### 3.3 Password strength rules (strong password)
The password MUST satisfy ALL of the following:
- Minimum length of **8 characters**.
- At least **1 uppercase** letter.
- At least **1 lowercase** letter.
- At least **1 digit**.
- At least **1 special character** from the set: `@ $ ! % * ? &`.

### 3.4 Confirm password
- The **Confirm Password** field MUST match the **Password** field exactly.
- If the two fields do not match, the system MUST reject the registration.

### 3.5 Post-registration behavior
- On successful registration, the user MUST be redirected to the **Login** page.

## 4. Inputs Summary (for test design)

| Field | Type | Constraint |
| --- | --- | --- |
| Full Name | string | Required; must not be empty |
| Email | string | Required; valid format `user@domain.com`; unique in system |
| Password | string | Required; min 8 chars; ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special (`@ $ ! % * ? &`) |
| Confirm Password | string | Required; must exactly equal Password |

## 5. Expected Outputs

- **Success:** account created, response `{ message: "User registered successfully", id }`, redirect to Login page.
- **Failure (validation):** registration rejected with an appropriate error message (invalid email format, duplicate email, weak password, password mismatch, or missing required field).