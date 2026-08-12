# xray-mini-app-wallet implementation 0013 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0013
Created: 20260812T110024Z
Evidence-Mode: LOCAL
Depends-On: NONE
Provider-Evidence: NONE

## Inputs and authority

| Input | Kind | Required | Purpose |
| --- | --- | --- | --- |
| Local bridge imports and the human-approved compact xray-js API | `LOCAL` | Yes | Migrate runtime consumption without behavior changes. |

## Objective

Adopt compact Mini App Bridge client and React namespaces in Wallet.

## Changes to implement

| Change ID | Requirement | Compatibility | Local owner | Validation |
| --- | --- | --- | --- | --- |
| C01 | Migrate platform and Cardano clients to root namespaces. | Preserve routing and transaction operations. | frontend | Typecheck and build. |
| C02 | Migrate Cardano hooks to `react.cardano.bridge`. | Preserve account, explorer, and settings behavior. | frontend | Typecheck, build, and import audit. |

## Implementation steps

1. Update bridge imports and references.
2. Run validation and diff checks.

## Validation

- `npm run typecheck`
- `npm run build`
- obsolete-import audit
- `git diff --check`

## Compatibility and human review

Review unchanged Wallet data, signing, submission, and routing behavior.

## Completion criteria

Wallet uses only compact bridge namespaces and validates.

## Out of scope

Feature, transaction, or UI changes.

## Blockers

None.
