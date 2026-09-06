# xray-mini-app-wallet implementation 0019 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0019
Created: 20260831T091322Z
Evidence-Mode: LOCAL
Depends-On: NONE
Provider-Evidence: NONE

## Inputs and authority

| Input                                           | Kind    | Required | Purpose                                                                                                                       |
| ----------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Current human request and minimum-ADA diagnosis | `LOCAL` | Yes      | Replace the observed fixed `0.969750` ADA floor with exact output-specific detection without changing source during planning. |
| `app/components/pages/Home/index.tsx`           | `LOCAL` | Yes      | Own ordinary-send form validation, preview sequencing, error presentation, and the hardcoded ADA minimum.                     |
| `app/integrations/xray-js/transaction.ts`       | `LOCAL` | Yes      | Own typed Cardano output conversion and the reusable transaction calculation boundary.                                        |
| `app/integrations/xray-js/transaction.test.js`  | `LOCAL` | Yes      | Extend deterministic offline coverage for address- and asset-dependent minimum ADA.                                           |
| `app/integrations/xray-js/CardanoProvider.tsx`  | `LOCAL` | Yes      | Preserve the network-specific Cardano client and its live protocol-parameter source.                                          |
| `app/utils/index.ts`                            | `LOCAL` | Yes      | Preserve the established `@xray-network/xray-js/cardano/lib` import boundary for low-level Cardano primitives.                |
| `package.json` and `package-lock.json`          | `LOCAL` | Yes      | Use the existing xray-js/Cardano Lib dependency and repository validation commands without adding packages.                   |

## Objective

Detect and enforce the exact minimum ADA for each ordinary-send output from its serialized Cardano shape and current network protocol parameters instead of using a fixed amount.

## Changes to implement

| Change ID | Requirement                                                                                                                                                                                                                                                                                                                                                                         | Compatibility                                                                                                                                                                                                                                                             | Local owner                              | Validation                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01       | Add a typed transaction helper that calculates minimum lovelace for an ordinary payment output from its recipient address and complete native-asset bundle, using the Cardano Lib output builder and a supplied `coinsPerUtxoByte`; do not approximate serialized size or embed a protocol coefficient.                                                                             | Use only the existing public `@xray-network/xray-js/cardano/lib` boundary and preserve exact base-unit asset quantities. The helper covers the payment outputs this app creates, which have no datum or reference script.                                                 | Wallet transaction utilities             | Offline unit tests prove ADA-only base and enterprise addresses have different minima and that adding a native asset increases the required lovelace.                 |
| C02       | Replace the `0.969750` input constraint with per-output minimum-ADA detection using `web3.getProtocolParameters()` and the exact output address/assets; recompute through the existing latest-request preview flow when an address, asset, or quantity changes, reject values below the detected floor before transaction submission, and show the required ADA amount to the user. | Preserve six-decimal ADA entry, multiple ordinary-send outputs, existing form reset/stale-request behavior, and final transaction-builder validation. Apply the rule independently to every explicit output; Send All remains builder-calculated and has no amount input. | Ordinary-send form and preview           | Component/source review plus tests confirm there is no fixed minimum, each output is checked independently, and below-minimum values cannot reach signing/submission. |
| C03       | Recognize the installed builder's `transaction output coin is below minimum ADA <lovelace>` failure as a minimum-ADA error and present its exact lovelace amount in ADA as a fallback when final builder validation detects a mismatch.                                                                                                                                             | Preserve unrelated insufficient-funds and transaction error reporting; the proactive calculation remains primary and error-string parsing is fallback presentation only.                                                                                                  | Transaction error presentation           | Focused unit coverage or an equivalent deterministic source-level test verifies current builder wording and exact six-decimal formatting.                             |
| C04       | Extend the repository's dependency-free Node test suite with deterministic minimum-ADA regression cases based on fixed protocol parameters and installed Cardano testing utilities.                                                                                                                                                                                                 | Do not add or update dependencies, contact a live provider, or weaken existing Send All tests.                                                                                                                                                                            | Transaction tests and package validation | `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check` pass.                                                                                        |

## Implementation steps

1. Build the smallest reusable minimum-lovelace helper in the transaction integration using the existing low-level Cardano Lib entry point, exact output address/assets, and an injected protocol coefficient.
2. Fetch protocol parameters through the ready Cardano client, calculate a minimum for every complete ordinary-send output within the sequence-guarded preview path, and keep incomplete form rows free of stale minimum feedback.
3. Remove the fixed `InputNumber` minimum, bind the detected value to ordinary-send validation and user feedback, and prevent below-minimum outputs from proceeding to preview success or bridge submission.
4. Update builder-error presentation for the installed minimum-ADA wording while retaining the builder as the final authority.
5. Add offline regression tests for base versus enterprise addresses, native-asset growth, below-minimum detection, and fallback formatting, then run all declared validation.

## Validation

- `npm test` must pass the existing Send All suite and the new offline minimum-ADA regression cases.
- `npm run typecheck` must pass. Planning baseline: passed on 2026-08-31.
- `npm run build` must pass. In restricted execution environments, run with permission to bind any React Router prerender preview server if required.
- `git diff --check` must pass.
- `rg -n '0\.969750|min="0\.969750"' app` must return no matches.
- Human review in XRAY App must verify an ADA-only ordinary send and a native-asset ordinary send, including a recipient/address or asset change that updates the required amount, an amount immediately below the floor, and an amount exactly at or above it.

## Compatibility and human review

- Minimum ADA is an output constraint, not a wallet balance or transaction-fee estimate; fee and coin selection remain owned by the final transaction builder.
- Every ordinary-send output is validated independently from its recipient address and exact selected asset bundle.
- Protocol parameters come from the effective-network Cardano client and must not be cached separately from the client's existing policy or replaced by a local constant.
- Send All continues assigning builder-calculated change to its recipient and does not gain a synthetic minimum amount field.
- Preserve existing ordinary-send asset decimals, duplicate-asset combination, multi-output behavior, debounced preview sequencing, reset behavior, and bridge submission flow.

## Completion criteria

- No fixed minimum ADA amount remains in the send form or transaction utilities.
- The detected minimum uses current `coinsPerUtxoByte` and exact Cardano output serialization for the recipient and asset bundle.
- ADA-only outputs with different serialized address sizes can produce different minima, and adding assets can raise the minimum.
- Every ordinary-send output below its floor is rejected with an exact, human-readable ADA requirement before signing/submission; the final builder remains authoritative.
- Existing Send All regression tests and all declared automated validation pass with no dependency changes.
- Human review confirms minimum feedback updates as ordinary-send output content changes.

## Out of scope

- Changes to the linked xray-js or Cardano Lib packages.
- Changing Cardano protocol parameters, provider caching, fee calculation, or coin-selection policy.
- Adding datum, reference-script, contract-output, or Byron-address support beyond the ordinary payment outputs currently accepted by the app.
- Redesigning Send All, asset selection, transaction breakdown, or bridge submission.
- Automatically increasing a user's entered ADA amount or splitting oversized multi-asset outputs.
- Accepting or rejecting this or any other implementation record.

## Blockers

None.
