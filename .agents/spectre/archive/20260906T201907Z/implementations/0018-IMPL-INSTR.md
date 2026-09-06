# xray-mini-app-wallet implementation 0018 instruction

Implementation-Version: v1
Implementation-ID: xray-mini-app-wallet/0018
Created: 20260825T111009Z
Evidence-Mode: LOCAL
Depends-On: NONE
Provider-Evidence: NONE

## Inputs and authority

| Input                                          | Kind    | Required | Purpose                                                                                                                         |
| ---------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Current human request and Send All diagnosis   | `LOCAL` | Yes      | Plan a correction for the observed recipient, preview, and submission failures without changing source during planning.         |
| `app/components/pages/Home/index.tsx`          | `LOCAL` | Yes      | Own the Send All toggle, recipient field, transaction construction, preview state, validation, and bridge submission lifecycle. |
| `app/integrations/xray-js/transaction.ts`      | `LOCAL` | Yes      | Own form-output conversion, output aggregation, quantity conversion, and transaction-fee extraction.                            |
| `app/integrations/xray-js/CardanoProvider.tsx` | `LOCAL` | Yes      | Preserve the current Cardano transaction-builder and address-validation boundary.                                               |
| `app/components/informers/Ada/index.tsx`       | `LOCAL` | Yes      | Preserve lovelace display semantics while showing the amount the recipient actually receives.                                   |
| `app/components/informers/Asset/index.tsx`     | `LOCAL` | Yes      | Preserve native-asset quantity and decimal display semantics.                                                                   |
| `app/components/informers/Breakdown/index.tsx` | `LOCAL` | Yes      | Preserve the existing breakdown presentation while correcting its Send All labels and values.                                   |
| `app/types/index.ts`                           | `LOCAL` | Yes      | Preserve the repository-owned Cardano and bridge type boundary.                                                                 |
| `package.json` and `package-lock.json`         | `LOCAL` | Yes      | Preserve the Node and SDK constraints and define repository-native regression validation without adding a test dependency.      |

## Objective

Correct the Send All flow so the entered recipient receives every spendable account UTxO value and native asset after the transaction fee, the preview reflects the built transaction, and submission has deterministic validation and user-visible completion state.

## Changes to implement

| Change ID | Requirement                                                                                                                                                                                                                                                                 | Compatibility                                                                                                                                                     | Local owner                             | Validation                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01       | Build Send All from every account UTxO with the single validated form recipient as the transaction change address; never derive the destination from an input UTxO and do not add a fixed full-balance payment output that leaves no value for fees.                        | Preserve Cardano builder fee/minimum-ADA calculation, exact native-asset quantities, and the existing non-Send-All payment path.                                  | Wallet transaction construction         | Automated tests prove the built output uses a recipient distinct from the input address, contains all input assets, and carries input lovelace minus the reported fee. |
| C02       | Derive the Send All preview from the built transaction's destination output rather than raw account inputs; label the received amount and fee so the UI never presents the fee as an amount added beyond the available balance.                                             | Preserve existing ADA/native-asset formatting and ordinary-send subtotal semantics.                                                                               | Wallet transaction summary              | Automated summary tests and human review confirm the displayed received amount plus fee reconciles to the spent input value for the supported simple transfer.         |
| C03       | Replace timer-based validation and overlapping preview updates with an awaited validated form snapshot and a latest-request guard or equivalent deterministic mechanism; incomplete/invalid input clears the preview, and stale builds cannot overwrite newer state.        | Preserve debounced address/quantity feedback and prevent validation promise rejections from escaping.                                                             | Send form state                         | Automated state-independent helper coverage where applicable, typecheck evidence, and rapid recipient-edit human review.                                               |
| C04       | Await `clientCardanoV1.signAndSubmitTx`, hold the form in a loading/disabled state for the interactive request, handle both rejected promises and `{ success: false, error }` responses, show success only for `{ success: true, hash }`, and prevent duplicate submission. | Continue sending the unsigned builder CBOR through the host's combined sign-and-submit operation; preserve host cancellation and error text when safe to display. | Cardano bridge submission               | Human review covers success, host rejection/cancellation, and repeated-click prevention; negative source scans reject fire-and-forget submission.                      |
| C05       | Add focused regression coverage using Node's built-in test runner and the installed Cardano testing utilities, with a repository `npm test` command and no new testing dependency.                                                                                          | Keep production dependency versions unchanged and keep tests independent of live network/provider access.                                                         | Transaction helpers and package scripts | `npm test` passes and covers recipient routing, fee-adjusted lovelace, native-asset preservation, and built-output summarization.                                      |

## Implementation steps

1. Extract the smallest typed transaction helper boundary needed to build and summarize a Send All transaction independently of React state.
2. Build Send All by spending the account UTxOs and assigning the validated form recipient as the change destination; retain the ordinary-send `payTo` and account change-address behavior.
3. Feed the Send All breakdown from the actual built destination output and reported fee, including all native assets with their known display decimals.
4. Make form validation and preview construction awaitable and sequence-safe so only the latest valid snapshot can update fee, output, validation, and error state.
5. Await the combined bridge sign-and-submit request, enforce one in-flight submission, and surface its discriminated success/failure result before clearing loading state.
6. Add deterministic Node tests and the `npm test` script without adding a package, then run all declared validation.

## Validation

- `npm test` must pass the new offline Send All regression suite.
- `npm run build` must pass. In restricted execution environments, run with permission to bind the local React Router prerender preview server.
- `npm run typecheck` must introduce no diagnostics from the planned files. Planning baseline: the command currently reports only the unrelated `app/components/informers/Explorer/index.tsx:56` `string`-to-`Explorer` mismatch; record that expected baseline failure unless it is resolved independently before implementation.
- `git diff --check` must pass.
- `rg -n 'setChangeAddress\(outputs\[0\]\.address\)|void clientCardanoV1\.signAndSubmitTx|setTimeout\(async' app/components/pages/Home/index.tsx` must return no matches.
- Human review in XRAY App must verify a Send All transaction to an address different from every input address, fee-adjusted ADA and all native assets in the preview, success feedback, host rejection/cancellation feedback, and duplicate-click prevention.

## Compatibility and human review

- Ordinary sends must retain explicit `payTo` outputs and return change to `accountState.paymentAddress`.
- Send All remains a one-recipient operation and spends only `accountState.state.utxos`; staking rewards and other non-UTxO balances are not included.
- Address validation and effective-network behavior remain owned by the current Cardano provider.
- The host remains responsible for signing and submitting the unsigned transaction through `cardano/v1`.
- Review a wallet with ADA only and a wallet with multiple native assets. If the SDK rejects an oversized single change output or insufficient minimum ADA, surface that builder error without inventing output splitting.

## Completion criteria

- A destination distinct from the input addresses receives the Send All output.
- The destination output contains every selected input native asset at its exact base-unit quantity.
- For this simple transfer, destination lovelace plus the reported fee equals total input lovelace.
- The preview uses built-output values and cannot be overwritten by an older validation/build request.
- Signing/submission is single-flight and every bridge success or failure produces user-visible feedback.
- Regression tests, production build, diff check, source scan, and the scoped typecheck expectation are recorded honestly in the result.
- Existing user changes in `app/components/pages/Home/index.tsx` are preserved except where this instruction explicitly refines the Send All/submission flow.

## Out of scope

- Changes to the linked `xray-js` SDK or bridge host.
- Fixing the unrelated Explorer type mismatch.
- Spending staking rewards, deposits, collateral, or balances not represented by the account UTxOs.
- Automatically splitting oversized multi-asset bundles across several outputs.
- Redesigning ordinary-send amount/asset selection or unrelated wallet UI.
- Accepting or rejecting this or any other implementation record.

## Blockers

None.
