import type { CW3Types } from "@/types"

type PolicyId = string
type AssetName = string
type Cw3JsonTx = {
  auxiliary_data: any
  body: {
    fee: number
    inputs: any
    outputs: {
      AlonzoFormatTxOut: {
        address: string
        amount: {
          coin: number
          multiasset: Map<PolicyId, Map<AssetName, number>>
        }
        datum_hash: string | undefined
      }
    }[]
    [key: string]: any
  }
  witness_set: {
    bootstrap_witnesses: any | undefined
    native_scripts: any | undefined
    plutus_datums: any | undefined
    plutus_v1_scripts: any | undefined
    plutus_v2_scripts: any | undefined
    plutus_v3_scripts: any | undefined
    redeemers: any | undefined
    vkeywitnesses: any | undefined
  }
  is_valid: boolean
}

const transformOutputs = (outputs: Cw3JsonTx["body"]["outputs"]) => {
  return outputs.map(({ AlonzoFormatTxOut }) => {
    const { address, amount } = AlonzoFormatTxOut
    const assets: { policyId: string; assetName: string; quantity: bigint; decimals?: number }[] = []
    amount.multiasset.forEach((assetsMap, policyId) => {
      assetsMap.forEach((quantity, assetName) => {
        assets.push({
          policyId,
          assetName,
          quantity: BigInt(quantity.toString()),
          decimals: 0,
        })
      })
    })
    return {
      address,
      value: BigInt(amount.coin),
      assets,
    }
  })
}

export const parseJsonTx = (tx: Cw3JsonTx) => {
  return {
    isValid: tx.is_valid,
    inputs: tx.body.inputs,
    outputs: transformOutputs(tx.body.outputs),
    fee: BigInt(tx.body.fee),
  }
}

export const formValuesToOutputs = (formValues: any = []): CW3Types.Output[] => {
  const outputs: {
    address: string
    value: bigint
    assets: {
      policyId: string
      assetName: string
      quantity: bigint
      decimals: number
    }[]
  }[] = []

  formValues.forEach(
    ({
      address,
      value,
      assets = [],
    }: {
      address: string
      value: string
      assets: { assetId: string; quantity: bigint; decimals: string }[]
    }) => {
      if (address || value) {
        const result = {
          address,
          value: convertQuantity(value, 6),
          assets: new Map<string, { policyId: string; assetName: string; quantity: bigint; decimals: number }>(),
        }

        assets.forEach((asset) => {
          if (asset.assetId && asset.quantity) {
            const policyId = asset.assetId.slice(0, 56)
            const assetName = asset.assetId.slice(56)
            const quantity = convertQuantity(asset.quantity, Number(asset.decimals))
            const assetKey = `${policyId}-${assetName}`
            const decimals = asset.decimals

            if (result.assets.has(assetKey)) {
              result.assets.get(assetKey)!.quantity += quantity
            } else {
              result.assets.set(assetKey, { policyId, assetName, quantity, decimals: Number(decimals) })
            }
          }
        })

        outputs.push({
          address: result.address,
          value: result.value,
          assets: Array.from(result.assets.values()),
        })
      }
    }
  )
  return outputs
}

export const flattenOutputs = (
  outputs: CW3Types.Output[]
): {
  value: bigint
  assets: { policyId: string; assetName: string; quantity: bigint; decimals: number }[]
} => {
  let totalValue: bigint = BigInt(0)
  const assetMap = new Map<string, { policyId: string; assetName: string; quantity: bigint; decimals: number }>()
  outputs.forEach(({ value, assets }) => {
    totalValue += value || 0n
    assets?.forEach(({ policyId, assetName, quantity, decimals }) => {
      const assetKey = `${policyId}-${assetName}`
      if (assetMap.has(assetKey)) {
        assetMap.get(assetKey)!.quantity += quantity
      } else {
        assetMap.set(assetKey, { policyId, assetName, quantity, decimals: decimals || 0 })
      }
    })
  })
  return {
    value: totalValue,
    assets: Array.from(assetMap.values()),
  }
}

export const convertQuantity = (value: string | number | bigint, decimals: number): bigint => {
  if (!value) return 0n
  const sanitizedValue = value.toString().replace(/[^\d.]/g, "")
  const adjustedValue = (parseFloat(sanitizedValue) * Math.pow(10, decimals)).toFixed(0)
  return BigInt(adjustedValue)
}
