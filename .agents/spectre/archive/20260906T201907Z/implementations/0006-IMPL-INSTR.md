# xray-mini-app-wallet implementation 0006 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0006
Created: 20260811T093220Z
Evidence-Mode: LOCAL
Depends-On: xray-mini-app-wallet/0005
Provider-Evidence: NONE

## Objective

Adopt direct platform and Cardano bridge module namespace imports.

## Changes to implement

| Change ID | Requirement | Compatibility | Local owner | Validation |
| --- | --- | --- | --- | --- |
| C01 | Replace named bridge client wrapper imports with namespace imports. | Coordinated pre-release change. | Wallet bridge consumers | Typecheck and build. |

## Validation

- `npm run typecheck`
- `npm run build`
