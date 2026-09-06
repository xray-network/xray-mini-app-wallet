# xray-mini-app-wallet implementation 0017 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0017
Created: 20260819T131657Z
Evidence-Mode: LOCAL
Depends-On: mini-app-bridge/0014
Provider-Evidence: NONE

## Inputs and authority

| Input | Kind | Required | Purpose |
| --- | --- | --- | --- |
| Normalized SDK status contract and Wallet bridge integration | `LOCAL` | Yes | Preserve status-derived account behavior. |

## Objective

Adopt the normalized status SDK with no Wallet behavior change.

## Changes to implement

| Change ID | Requirement | Compatibility | Validation |
| --- | --- | --- | --- |
| C01 | Confirm React status still supplies `{ host, account }`; remove any direct duplicated-account assumptions or update docs if present. | Preserve host states, construction, consent, submission, and errors. | Typecheck, build, scan, and diff check pass. |

## Implementation steps

1. Align affected consumption/docs only if required.
2. Validate.

## Validation

- `npm run typecheck`, `npm run build`, and `git diff --check`.

## Compatibility and human review

Review host/account states and representative transaction submission.

## Completion criteria

Wallet builds against the normalized SDK without reading account from low-level payload.

## Out of scope

Wallet operation or UI changes.

## Blockers

Implement after SDK plan `mini-app-bridge/0014`.
