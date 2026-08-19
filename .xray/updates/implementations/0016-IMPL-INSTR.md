# xray-mini-app-wallet implementation 0016 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0016
Created: 20260819T091039Z
Evidence-Mode: LOCAL
Depends-On: NONE
Provider-Evidence: NONE

## Inputs and authority

| Input                                                                                         | Kind    | Required | Purpose                                                               |
| --------------------------------------------------------------------------------------------- | ------- | -------- | --------------------------------------------------------------------- |
| Human-approved scope-versioned bridge contract dated 2026-08-19                               | `LOCAL` | Yes      | Define handshake-free platform/Cardano clients and exact XRAY status. |
| `package.json`, `package-lock.json`, and `README.md`                                          | `LOCAL` | Yes      | Preserve linked SDK resolution and repository validation.             |
| `app/integrations/xray-js/useEffectiveSettings.ts` and `app/shared/routing/HostRouteSync.tsx` | `LOCAL` | Yes      | Own host settings and route synchronization.                          |
| `app/components/pages/Home/index.tsx` and `app/types/index.ts`                                | `LOCAL` | Yes      | Own Wallet's Cardano bridge operations and types.                     |

## Objective

Adopt the scope-versioned bridge client in Wallet without a Provider or handshake while preserving wallet operations and standalone behavior.

## Changes to implement

| Change ID | Requirement                                                                                                                                                                                     | Compatibility                                                           | Local owner                                 | Validation                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| C01       | Replace grouped, legacy, and `/cardano` imports/types with direct platform/Cardano/CIP-30 v1 client and React namespaces actually used.                                                         | Remove retired APIs without shims.                                      | Manifest/lockfile, integrations, app types. | Typecheck and import scan pass.                                    |
| C02       | Replace Provider/handshake state with lazy platform status; distinguish selected Cardano account, accountless `{ host: "xray.app", account: null }`, unavailable host, and standalone behavior. | Status is not wallet authorization.                                     | Home host/account state.                    | State behavior and build pass.                                     |
| C03       | Migrate theme, currency, hide-balances, and route synchronization to direct platform/v1 hooks/events without connection gating, preserving local fallbacks and route-loop prevention.           | No handshake prerequisite.                                              | Effective settings and HostRouteSync.       | Typecheck/build pass.                                              |
| C04       | Migrate every Wallet Cardano and CIP-30 request/hook to direct v1 APIs while preserving account state, transaction/signing behavior, loading/null handling, feedback, and host errors.          | Existing host consent and operation authorization remain authoritative. | Home Wallet integration.                    | Complete referenced operation inventory and production build pass. |
| C05       | Remove obsolete Provider, handshake, capability, generic host-message, grouped-role, and protocol-subpath code/types; update relevant docs.                                                     | No legacy fallback.                                                     | App source/types and README.                | Stale scan, formatting, typecheck, and build pass.                 |

## Implementation steps

1. Align linked SDK imports and exported types.
2. Replace connection state with platform status.
3. Migrate settings/routes and Wallet Cardano/CIP-30 operations.
4. Remove retired code and update relevant documentation.
5. Run validation and review embedded/standalone flows.

## Validation

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `git diff --check`.
- Scan source for Provider/handshake/capability APIs, `useMiniApp`, `useHostMessage`, grouped `client`, legacy wire names, and `/mini-app-bridge/cardano` imports.

## Compatibility and human review

Implement after XRAY App host support. Human review must cover standalone and embedded selected/accountless states, preferences/routes, account loading, and representative signing/CIP-30 success, denial, and host errors.

## Completion criteria

- Wallet uses only direct scope-versioned platform/Cardano APIs.
- No Provider or handshake gates bridge usage.
- Wallet behavior and authorization/error feedback are preserved.
- Typecheck, build, and stale-contract audits pass.

## Out of scope

- XRAY App host, xray-js SDK, wallet feature redesign, or new adapters.
- Legacy protocol fallback.

## Blockers

None.
