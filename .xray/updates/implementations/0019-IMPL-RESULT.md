# xray-mini-app-wallet implementation 0019 result

Result-Version: v1
Implementation-ID: xray-mini-app-wallet/0019
Instruction: ./0019-IMPL-INSTR.md
Evidence-Mode: LOCAL

## Change dispositions

| Change ID | Disposition   | Implementation                                                                                                                                                                                                                                                                                           | Validation                                                                                                                                                                                            |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01       | `IMPLEMENTED` | Added typed minimum-lovelace inspection that constructs each exact address/native-asset output through `@xray-network/xray-js/cardano/lib` and delegates the fixed-point serialized-size calculation to `with_asset_and_min_required_coin` with an injected protocol coefficient.                        | Offline tests prove base and enterprise addresses have different ADA-only minima and that a native asset increases the enterprise output minimum.                                                     |
| C02       | `IMPLEMENTED` | Ordinary-send preview now obtains `coinsPerUtxoByte` from the effective-network Cardano client, calculates and displays each output's minimum, sets the matching input constraint/error, and returns before build or submission when any output is below its floor. Send All remains builder-calculated. | Typecheck and production build pass; source audit finds no fixed `0.969750` minimum; deterministic tests prove all violating output indexes are reported while an output exactly at its floor passes. |
| C03       | `IMPLEMENTED` | Centralized transaction error presentation recognizes `transaction output coin is below minimum ADA <lovelace>` and formats the exact builder-provided amount to six-decimal ADA as fallback feedback.                                                                                                   | Unit coverage verifies `978370` lovelace becomes `Minimum ADA required: 0.978370 ADA`.                                                                                                                |
| C04       | `IMPLEMENTED` | Extended the dependency-free Node suite from two to five tests without changing package manifests or contacting a live provider.                                                                                                                                                                         | `npm test`, `npm run typecheck`, permitted `npm run build`, formatting audit, source audit, and `git diff --check` pass.                                                                              |

## Outcome

Ordinary sends no longer assume a universal ADA floor. Each explicit output is checked against the exact minimum derived from its serialized recipient and native-asset bundle under the effective network's protocol coefficient, with inline feedback and a pre-submission guard while retaining final builder enforcement.

## Inputs consumed

- Current human implementation request and minimum-ADA diagnosis.
- `app/components/pages/Home/index.tsx`
- `app/integrations/xray-js/transaction.ts`
- `app/integrations/xray-js/transaction.test.js`
- `app/integrations/xray-js/CardanoProvider.tsx`
- `app/utils/index.ts`
- `package.json` and `package-lock.json`

## Project changes

- `app/integrations/xray-js/transaction.ts`: added exact output minimum calculation, multi-output violation inspection, six-decimal lovelace formatting, and current builder-error presentation.
- `app/components/pages/Home/index.tsx`: replaced the fixed ADA minimum with live-parameter, per-output constraints, hints, field errors, and preview/submission guarding.
- `app/integrations/xray-js/transaction.test.js`: added deterministic address-size, native-asset, multi-output violation, exact-floor, and builder-error regression coverage.
- `.xray/updates/implementations/0019-IMPL-RESULT.md`: recorded implementation evidence and remaining review.
- `.xray/updates/XRAY-UPDATES-STATUS.md`: moved implementation `0019` from `PLANNED` to `REVIEW` with this result link.

## Exported change contract

| Change ID | Semantic change                                                                                                                                   | Compatibility                                                                                                                    | Downstream action                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| C01       | Minimum lovelace is calculated from exact output serialization and a caller-supplied `coinsPerUtxoByte`, including address and native-asset size. | Existing xray-js public Cardano/Lib boundaries and base-unit asset quantities are preserved.                                     | Callers must supply the effective network coefficient and the complete output asset bundle.     |
| C02       | Every ordinary-send output must meet its independently calculated minimum before preview success or bridge submission.                            | Six-decimal entry, multi-output sends, Send All behavior, preview sequencing, reset, and final builder validation remain intact. | UI reviewers should verify feedback updates after recipient, asset, and quantity changes.       |
| C03       | Current builder minimum-ADA failures display the exact lovelace requirement in six-decimal ADA.                                                   | Other insufficient-funds and generic transaction errors retain their existing presentation.                                      | Treat parsed builder wording as fallback feedback; proactive output inspection remains primary. |
| C04       | Offline regression coverage fixes representative minima at `4310` lovelace per UTxO byte and checks all violating outputs.                        | No dependency, provider, or package-script changes are introduced.                                                               | Update expected fixtures only when an intentional Cardano serialization change is reviewed.     |

## Validation

- `npm test` — passed 5 tests in 2 suites with 0 failures; existing Send All coverage remains green.
- `npm run typecheck` — passed with no diagnostics.
- `npm run build` — passed after permission was granted for React Router's local prerender preview server. The first sandboxed attempt completed client/server compilation but could not bind `::1` (`listen EPERM`) and emitted file-watcher limit warnings before the permitted rerun succeeded and generated `build/client/index.html`.
- `git diff --check` — passed.
- `git diff --exit-code -- package.json package-lock.json` — passed; neither manifest changed.
- `rg -n '0\.969750|min="0\.969750"' app` — returned no matches.
- Positive source audit confirmed live `getProtocolParameters()`, Cardano Lib minimum-output construction, per-output inspection, and fallback minimum-error handling.
- Prettier check passed for all changed product/test files and the instruction.

## Deviations from instruction

None.

## Remaining human review

- In XRAY App, verify an ADA-only ordinary send updates its minimum when switching between supported recipient address shapes.
- Add a native asset or change its quantity and verify the required ADA updates for that output.
- Verify an amount immediately below the displayed floor is blocked with matching inline/alert feedback, while the exact floor or a higher amount can reach a valid preview.
- Verify multiple outputs display and enforce independent minima and Send All remains unchanged.

## Reproducibility

Run `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, the fixed-minimum source scan, and the package-manifest diff check recorded above. The production build requires permission to bind React Router's local prerender preview server in restricted environments.
