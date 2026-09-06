# xray-mini-app-wallet implementation 0018 result

Result-Version: v1
Implementation-ID: xray-mini-app-wallet/0018
Instruction: ./0018-IMPL-INSTR.md
Evidence-Mode: LOCAL

## Change dispositions

| Change ID | Disposition   | Implementation                                                                                                                                                                                                                                     | Validation                                                                                                                                                                              |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01       | `IMPLEMENTED` | Send All now builds from every account UTxO with the validated form recipient as the change destination; the ordinary-send `payTo` and account change path remains intact.                                                                         | Offline SDK regression proves every built output uses a recipient distinct from the source, preserves the native asset, and reconciles destination lovelace plus fee to input lovelace. |
| C02       | `IMPLEMENTED` | The SDK transaction is inspected from CBOR, Send All aggregates all built outputs for the recipient, asset display decimals are restored from account metadata, and the UI labels the amount as `Recipient Receives` with a non-additive `Tx Fee`. | Regression coverage exercises multi-output token-bearing change and recipient filtering; production build passes.                                                                       |
| C03       | `IMPLEMENTED` | Form validation is awaited, one stable debounced preview is cancelled on replacement/unmount, request IDs invalidate stale work, edits clear stale preview state, and list mutations no longer depend on timer callbacks.                          | Scoped typecheck has no diagnostics, the negative source scan finds no timer-based async validation, and source review confirms latest-request state guards.                            |
| C04       | `IMPLEMENTED` | Submission awaits the versioned bridge response payload, permits only one in-flight request, disables the form/toggle, handles missing, failed, and rejected responses, and emits success/error notifications.                                     | Scoped typecheck and production build pass; the negative source scan rejects fire-and-forget bridge submission. Live host outcomes remain for human review.                             |
| C05       | `IMPLEMENTED` | Added an offline Node test suite and `npm test` script using the installed Cardano in-memory provider, with no package or lockfile dependency change.                                                                                              | `npm test` passes 2 tests with 0 failures.                                                                                                                                              |

## Outcome

Send All now routes spendable UTxO value and native assets to the entered recipient rather than an input address, previews the fee-adjusted built outputs, rejects stale preview work, and reports the combined host sign-and-submit outcome without permitting duplicate submission.

## Inputs consumed

- Current human implementation request and prior Send All diagnosis.
- `app/components/pages/Home/index.tsx`
- `app/integrations/xray-js/transaction.ts`
- `app/integrations/xray-js/CardanoProvider.tsx`
- `app/components/informers/Ada/index.tsx`
- `app/components/informers/Asset/index.tsx`
- `app/components/informers/Breakdown/index.tsx`
- `app/types/index.ts`
- `package.json` and `package-lock.json`

## Project changes

- `app/components/pages/Home/index.tsx`: corrected recipient selection, inspected transaction summaries and fees, deterministic preview validation, and awaited single-flight submission feedback; preserved the existing QR visibility edit.
- `app/integrations/xray-js/transaction.ts`: added typed Send All construction and inspected-output aggregation helpers; removed the invalid raw-JSON fee reader.
- `app/integrations/xray-js/transaction.test.js`: added offline recipient, fee reconciliation, native-asset, multi-output, and recipient-filtering coverage.
- `package.json`: added the dependency-free `npm test` command.
- `.xray/updates/implementations/0018-IMPL-RESULT.md`: recorded this implementation outcome.
- `.xray/updates/XRAY-UPDATES-STATUS.md`: moved implementation `0018` from `PLANNED` to `REVIEW` with the matching result link.

## Exported change contract

| Change ID | Semantic change                                                                                                                          | Compatibility                                                       | Downstream action                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| C01       | Send All assigns all builder-calculated change to the single validated recipient, never to an input-derived address.                     | Ordinary sends retain explicit outputs and account-owned change.    | Consumers can treat the entered recipient as the sole Send All destination.                             |
| C02       | Send All preview values come from all built transaction outputs at that recipient, and the fee comes from typed CBOR inspection.         | ADA and native-asset display formats remain unchanged.              | UI reviewers should reconcile recipient lovelace plus fee to spent UTxO lovelace.                       |
| C03       | Only the latest valid form snapshot may publish preview, fee, validation, or transaction errors.                                         | Debounced feedback remains at 500 ms.                               | Future form mutations must call the shared preview queue so they invalidate stale work.                 |
| C04       | The bridge operation is one awaited sign-and-submit request with explicit success/failure feedback and one in-flight submission maximum. | The host still receives unsigned builder CBOR through `cardano/v1`. | Host integrations should return the existing response envelope with a discriminated submission payload. |
| C05       | `npm test` is the offline Send All regression command.                                                                                   | No dependency or lockfile changes are required.                     | Run it with the repository's supported Node version before review.                                      |

## Validation

- `npm test`: PASS — 2 tests, 0 failures.
- `npm run build`: PASS — client, SSR, and SPA prerender build completed when allowed to bind the local preview server.
- `npm run typecheck`: EXPECTED BASELINE FAILURE — only `app/components/informers/Explorer/index.tsx:56` reports the pre-declared `string`-to-`Explorer` mismatch; no planned or changed file reports a diagnostic.
- `git diff --check`: PASS.
- Negative source scan for input-derived change address, fire-and-forget bridge submission, and timer-based async validation: PASS with no matches.
- Ordinary-send source scan: PASS — explicit `payTo(outputs)` and `setChangeAddress(accountState.paymentAddress)` remain.
- Prettier check for changed source, test, manifest, and instruction files: PASS.
- Live XRAY App success, rejection/cancellation, rapid-edit, and repeated-click scenarios: NOT RUN — requires human review in a connected host session.

## Deviations from instruction

None. The implementation additionally discovered that `UnsignedTransaction.json` is a raw CBOR-shaped value rather than the typed inspection assumed by the removed fee helper; using the SDK's public CBOR inspection API is the planned built-output source and fixes the zero-fee preview within scope.

## Remaining human review

- Send All ADA-only funds to an address different from every input address and confirm the received value plus fee equals the spent input value.
- Repeat with multiple native assets and confirm every asset quantity and display decimal.
- Confirm success feedback, host rejection/cancellation feedback, and repeated-click prevention in XRAY App.
- Rapidly edit the recipient and confirm an older build never replaces the latest preview.
- Confirm an ordinary send still pays explicit outputs and returns change to the active account.

## Reproducibility

From the repository root with Node `>=22.22.0` and the installed linked SDK:

1. Run `npm test`.
2. Run `npm run typecheck` and compare its sole expected Explorer diagnostic with the planning baseline.
3. Run `npm run build` in an environment that permits React Router's local prerender preview server.
4. Run `git diff --check`.
5. Run `rg -n 'setChangeAddress\(outputs\[0\]\.address\)|void clientCardanoV1\.signAndSubmitTx|setTimeout\(async' app/components/pages/Home/index.tsx`; it must return no matches.
6. Run the human-review scenarios in XRAY App.
