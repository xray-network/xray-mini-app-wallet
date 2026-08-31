import { utilities, type Cardano, type types as CardanoTypes } from "@xray-network/xray-js/cardano"
import * as cardanoLib from "@xray-network/xray-js/cardano/lib"

export type FlattenedOutputs = {
  value: bigint
  assets: { policyId: string; assetName: string; quantity: bigint; decimals: number }[]
}

type InspectedOutput = {
  address: string
  lovelace: bigint
  assets: readonly { policyId: string; assetName: string; quantity: bigint }[]
}

export type MinimumAdaViolation = {
  outputIndex: number
  value: bigint
  minimum: bigint
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

export const minimumLovelaceForOutput = (
  output: Pick<CardanoTypes.Output, "address" | "assets">,
  coinsPerUtxoByte: bigint
): bigint => {
  const multiAsset = cardanoLib.chain.MultiAsset.new()

  output.assets?.forEach(({ policyId, assetName, quantity }) => {
    multiAsset.insert(
      cardanoLib.crypto.ScriptHash.from_hex(policyId),
      cardanoLib.chain.AssetName.from_raw_bytes(utilities.encoding.fromHex(assetName)),
      quantity
    )
  })

  return cardanoLib.chain.TransactionOutputBuilder.new()
    .with_address(cardanoLib.chain.Address.from_bech32(output.address))
    .next()
    .with_asset_and_min_required_coin(multiAsset, coinsPerUtxoByte)
    .build()
    .output()
    .amount()
    .coin()
}

export const inspectMinimumAda = (outputs: readonly CardanoTypes.Output[], coinsPerUtxoByte: bigint) => {
  const minimums = outputs.map((output) => minimumLovelaceForOutput(output, coinsPerUtxoByte))
  const violations = outputs.flatMap((output, outputIndex): MinimumAdaViolation[] => {
    const value = output.value ?? 0n
    const minimum = minimums[outputIndex]
    return value < minimum ? [{ outputIndex, value, minimum }] : []
  })

  return { minimums, violations }
}

export const formatLovelaceAsAda = (value: bigint): string => {
  const sign = value < 0n ? "-" : ""
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / 1_000_000n}.${(absolute % 1_000_000n).toString().padStart(6, "0")}`
}

export const transactionErrorMessage = (cause: unknown): string => {
  const detail = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : ""
  if (detail.includes("UTxO Balance Insufficient")) return "Transaction error: Insufficient funds"

  const minimumAda = /transaction output coin is below minimum ADA (\d+)/i.exec(detail)
  if (minimumAda) return `Minimum ADA required: ${formatLovelaceAsAda(BigInt(minimumAda[1]))} ADA`

  return detail ? `Transaction error: ${detail}` : "Transaction error: Invalid transaction or insufficient funds"
}

export const buildSendAllTransaction = (cardano: Cardano, utxos: CardanoTypes.Utxo[], recipient: string) =>
  cardano.transactions.create().spend(utxos).setChangeAddress(recipient).build()

export const convertQuantity = (value: string | number | bigint, decimals: number): bigint => {
  if (!value) return 0n
  const sanitizedValue = value.toString().replace(/[^\d.]/g, "")
  const adjustedValue = (parseFloat(sanitizedValue) * Math.pow(10, decimals)).toFixed(0)
  return BigInt(adjustedValue)
}
