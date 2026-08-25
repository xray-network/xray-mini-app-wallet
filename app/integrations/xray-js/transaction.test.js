import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createCardano } from "@xray-network/xray-js/cardano"
import { createInMemoryProvider } from "@xray-network/xray-js/cardano/testing"
import { buildSendAllTransaction, flattenTransactionOutputs } from "./transaction.ts"

const sourceAddress =
  "addr_test1qzd2ulz7jx0zn3t90vep26f7gl9wkj03lx0w5ca0vhnl5u6nfathe437695m4cwzlgn959uswtm56dkkmvxjx6h6mfssh7t4zy"
const recipientAddress = "addr_test1vzd2ulz7jx0zn3t90vep26f7gl9wkj03lx0w5ca0vhnl5uc34x82v"
const asset = {
  policyId: "11".repeat(28),
  assetName: "58524159",
  quantity: 42n,
  decimals: 2,
}
const inputValue = 5_000_000_000n
const utxo = {
  transaction: { id: "0".repeat(64) },
  index: 0,
  address: sourceAddress,
  value: inputValue,
  assets: [asset],
  datumHash: null,
  datumType: null,
  scriptHash: null,
  datum: null,
  script: null,
}

describe("Send All transactions", () => {
  it("routes every built output to the recipient and reconciles value with the fee", async () => {
    const cardano = createCardano({
      network: "preview",
      provider: createInMemoryProvider({ utxos: [utxo] }),
    })

    const transaction = await buildSendAllTransaction(cardano, [utxo], recipientAddress)
    const inspection = cardano.transactions.inspect(transaction.cbor)
    const summary = flattenTransactionOutputs(inspection.outputs, recipientAddress, {
      [asset.policyId + asset.assetName]: asset.decimals,
    })

    assert.notEqual(recipientAddress, sourceAddress)
    assert.ok(inspection.outputs.length > 0)
    assert.ok(inspection.outputs.every(({ address }) => address === recipientAddress))
    assert.equal(summary.value + inspection.fee, inputValue)
    assert.deepEqual(summary.assets, [asset])
  })

  it("summarizes only outputs assigned to the requested recipient", () => {
    const summary = flattenTransactionOutputs(
      [
        { address: sourceAddress, lovelace: 3_000_000n, assets: [] },
        { address: recipientAddress, lovelace: 2_000_000n, assets: [asset] },
      ],
      recipientAddress,
      { [asset.policyId + asset.assetName]: asset.decimals }
    )

    assert.deepEqual(summary, { value: 2_000_000n, assets: [asset] })
  })
})
