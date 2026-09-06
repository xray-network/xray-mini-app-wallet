# xray-mini-app-wallet implementation 0015 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0015
Created: 20260812T114643Z
Evidence-Mode: LOCAL
Depends-On: xray-js/cardano/0008
Provider-Evidence: NONE

## Inputs and authority

| Input                       | Kind    | Required | Purpose                                                          |
| --------------------------- | ------- | -------- | ---------------------------------------------------------------- |
| Grouped Cardano utility API | `LOCAL` | Yes      | Migrate helpers and provider wiring to the new public namespace. |

## Objective

Consume Cardano helpers through `utilities` from `@xray-network/xray-js/cardano`.

## Changes to implement

| Change ID | Requirement                                                                                           | Compatibility                         | Local owner                           | Validation                          |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ----------------------------------- |
| C01       | Replace root helper imports with `utilities.assets`, `utilities.encoding`, and `utilities.addresses`. | Preserve wallet behavior.             | Wallet utilities and Cardano provider | Typecheck, build, and import audit. |
| C02       | Update dynamic import and provider types for the grouped namespace.                                   | Preserve lazy Cardano initialization. | Cardano provider                      | Typecheck and build.                |

## Implementation steps

1. Update helper imports and references.
2. Update the dynamic Cardano module projection.
3. Run application validation and diff checks.

## Validation

- `npm run typecheck`
- `npm run build`
- retired-import audit
- `git diff --check`

## Compatibility and human review

Review the grouped namespace and lazy-provider migration.

## Completion criteria

The application uses only the grouped Cardano utility API and validates.

## Out of scope

Wallet behavior or UI changes.

## Blockers

None.
