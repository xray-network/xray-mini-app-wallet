# XRAY Updates status

Status-Version: v1

This is the only lifecycle and decision-proof ledger for all implementation records.

## xray-mini-app-wallet implementation status

Target: xray-mini-app-wallet

### Implementation ledger

| ID     | Title                                | Instruction                                         | State      | Result                                          | Evidence mode | Decision proof                                                                                                                       |
| ------ | ------------------------------------ | --------------------------------------------------- | ---------- | ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `0001` | Install XRAY Updates                 | [Instruction](./implementations/0001-IMPL-INSTR.md) | `ACCEPTED` | [Result](./implementations/0001-IMPL-RESULT.md) | `LOCAL`       | Human requested installation of XRAY Updates.                                                                                        |
| `0002` | Adopt template structure and runtime | [Instruction](./implementations/0002-IMPL-INSTR.md) | `REVIEW`   | [Result](./implementations/0002-IMPL-RESULT.md) | `LOCAL`       | Template boundaries, the linked xray-js bridge/Cardano facade, and utility/dependency consolidation validate and await human review. |
| `0003` | Adopt grouped Cardano exports | [Instruction](./implementations/0003-IMPL-INSTR.md) | `REVIEW` | [Result](./implementations/0003-IMPL-RESULT.md) | `LOCAL` | Grouped Cardano config/types/CIP-67, typecheck, and production build pass. |
| `0004` | Adopt bridge host context | [Instruction](./implementations/0004-IMPL-INSTR.md) | `REVIEW` | [Result](./implementations/0004-IMPL-RESULT.md) | `LOCAL` | Context integration, typecheck, and build pass. |
| `0005` | Adopt Cardano bridge adapter | [Instruction](./implementations/0005-IMPL-INSTR.md) | `REVIEW` | [Result](./implementations/0005-IMPL-RESULT.md) | `LOCAL` | Cardano account/transaction migration, typecheck, and build pass and await human review. |
| `0006` | Adopt direct bridge modules | [Instruction](./implementations/0006-IMPL-INSTR.md) | `REVIEW` | [Result](./implementations/0006-IMPL-RESULT.md) | `LOCAL` | Direct platform/Cardano imports, typecheck, and build pass and await human review. |
