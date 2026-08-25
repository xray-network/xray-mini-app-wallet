import type { Cardano, types as CardanoTypes } from "@xray-network/xray-js/cardano"

export type FlattenedOutputs = {
  value: bigint
  assets: { policyId: string; assetName: string; quantity: bigint; decimals: number }[]
}

type InspectedOutput = {
  address: string
  lovelace: bigint
  assets: readonly { policyId: string; assetName: string; quantity: bigint }[]
}

export const formValuesToOutputs = (formValues: any = []): CardanoTypes.Output[] => {
  const outputs: CardanoTypes.Output[] = []

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
      if (!address && !value) return
      const combinedAssets = new Map<
        string,
        { policyId: string; assetName: string; quantity: bigint; decimals: number }
      >()

      assets.forEach((asset) => {
        if (!asset.assetId || !asset.quantity) return
        const policyId = asset.assetId.slice(0, 56)
        const assetName = asset.assetId.slice(56)
        const quantity = convertQuantity(asset.quantity, Number(asset.decimals))
        const assetKey = `${policyId}-${assetName}`
        const existing = combinedAssets.get(assetKey)
        if (existing) existing.quantity += quantity
        else combinedAssets.set(assetKey, { policyId, assetName, quantity, decimals: Number(asset.decimals) })
      })

      outputs.push({ address, value: convertQuantity(value, 6), assets: Array.from(combinedAssets.values()) })
    }
  )

  return outputs
}

export const flattenOutputs = (outputs: readonly CardanoTypes.Output[]): FlattenedOutputs => {
  let totalValue = 0n
  const assetMap = new Map<string, { policyId: string; assetName: string; quantity: bigint; decimals: number }>()

  outputs.forEach(({ value, assets }) => {
    totalValue += value || 0n
    assets?.forEach(({ policyId, assetName, quantity, decimals }) => {
      const assetKey = `${policyId}-${assetName}`
      const existing = assetMap.get(assetKey)
      if (existing) existing.quantity += quantity
      else assetMap.set(assetKey, { policyId, assetName, quantity, decimals: decimals || 0 })
    })
  })

  return { value: totalValue, assets: Array.from(assetMap.values()) }
}

export const flattenTransactionOutputs = (
  outputs: readonly InspectedOutput[],
  recipient: string,
  decimalsByAssetId: Readonly<Record<string, number>> = {}
): FlattenedOutputs =>
  flattenOutputs(
    outputs
      .filter(({ address }) => address === recipient)
      .map(({ address, lovelace, assets }) => ({
        address,
        value: lovelace,
        assets: assets.map((asset) => ({
          ...asset,
          decimals: decimalsByAssetId[asset.policyId + asset.assetName] ?? 0,
        })),
      }))
  )

export const buildSendAllTransaction = (cardano: Cardano, utxos: CardanoTypes.Utxo[], recipient: string) =>
  cardano.transactions.create().spend(utxos).setChangeAddress(recipient).build()

export const convertQuantity = (value: string | number | bigint, decimals: number): bigint => {
  if (!value) return 0n
  const sanitizedValue = value.toString().replace(/[^\d.]/g, "")
  const adjustedValue = (parseFloat(sanitizedValue) * Math.pow(10, decimals)).toFixed(0)
  return BigInt(adjustedValue)
}
