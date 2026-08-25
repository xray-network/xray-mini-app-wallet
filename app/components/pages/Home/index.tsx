import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react"
import { Checkbox, Form, Input, InputNumber, Button, Select, Empty, Alert, Space, Col, Row } from "antd"
import QRCode from "react-qr-code"
import { clientCardanoV1 } from "@xray-network/xray-js/mini-app-bridge"
import { cardanoV1, platformV1 } from "@xray-network/xray-js/mini-app-bridge/react"
import { useCardano } from "@/integrations/xray-js/CardanoProvider"
import style from "./style.module.css"
import { debounce } from "lodash"
import Informers from "@/components/informers"
import AssetImage from "@/components/common/AssetImage"
import * as TransactionUtils from "@/integrations/xray-js/transaction"
import * as Utils from "@/utils"
import { notification } from "@/theme/EscapeAntd"
import {
  ArrowRightIcon,
  TrashIcon,
  PlusCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline"

type ProcessAction = "preview" | "send"

const transactionErrorMessage = (cause: unknown) => {
  const detail = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : ""
  if (detail.includes("UTxO Balance Insufficient")) return "Transaction error: Insufficient funds"
  if (/less tha?n the minimum UTXO value/i.test(detail)) return `Requirement to send assets: ${detail}`
  return detail ? `Transaction error: ${detail}` : "Transaction error: Invalid transaction or insufficient funds"
}

export const HomePage = () => {
  const cardano = useCardano()
  const web3 = cardano.status === "ready" ? cardano.client : null
  const addresses = cardano.status === "ready" ? cardano.addresses : null
  const accountState = cardanoV1.useAccountState().data
  const status = platformV1.useStatus()
  const standalone = typeof window !== "undefined" && window.parent === window
  const unavailableMessage = status.data?.account
    ? "Cardano account data is not yet available."
    : status.data
      ? "Select a Cardano account in XRAY App before creating a transaction."
      : standalone
        ? "Open this mini app inside XRAY App before creating a transaction."
        : "XRAY App did not respond to the platform status request."

  const accountAssets = accountState?.state?.balance?.assets ?? []
  const accountUtxos = accountState?.state?.utxos ?? []

  const decimalsList = useMemo(
    () =>
      accountAssets.reduce(
        (acc, asset) => {
          acc[asset.policyId + asset.assetName] = asset.decimals || 0
          return acc
        },
        {} as { [key: string]: number }
      ),
    [accountAssets]
  )

  const [form] = Form.useForm()
  const [sendAll, setSendAll] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{ [key: string]: string }>({})
  const [validated, setValidated] = useState(false)
  const [transactionFee, setTransactionFee] = useState(0n)
  const [flattenedOutputs, setFlattenedOutputs] = useState<ReturnType<typeof TransactionUtils.flattenOutputs>>()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)
  const submissionInFlightRef = useRef(false)

  const clearPreview = useCallback((nextError = "") => {
    setValidated(false)
    setTransactionFee(0n)
    setFlattenedOutputs(undefined)
    setError(nextError)
  }, [])

  const processForm = useCallback(
    async (action: ProcessAction, requestId: number) => {
      if (requestId !== requestIdRef.current) return

      let values: { outputs?: unknown[] }
      try {
        values = await form.validateFields()
      } catch {
        if (requestId === requestIdRef.current) clearPreview()
        return
      }
      if (requestId !== requestIdRef.current) return

      const outputs = TransactionUtils.formValuesToOutputs(values.outputs)
      const recipient = outputs[0]?.address
      if (!accountState || !web3 || !recipient || !accountUtxos.length) {
        clearPreview(accountUtxos.length ? "" : "Transaction error: No spendable UTxOs available")
        return
      }

      let txData: Awaited<ReturnType<typeof TransactionUtils.buildSendAllTransaction>>
      try {
        txData = sendAll
          ? await TransactionUtils.buildSendAllTransaction(web3, accountUtxos, recipient)
          : await web3.transactions
              .create()
              .spend(accountUtxos)
              .payTo(outputs)
              .setChangeAddress(accountState.paymentAddress)
              .build()
        const inspection = web3.transactions.inspect(txData.cbor)
        const summary = sendAll
          ? TransactionUtils.flattenTransactionOutputs(inspection.outputs, recipient, decimalsList)
          : TransactionUtils.flattenOutputs(outputs)

        if (requestId !== requestIdRef.current) return
        setTransactionFee(inspection.fee)
        setFlattenedOutputs(summary)
        setValidated(true)
        setError("")
      } catch (cause: unknown) {
        if (requestId !== requestIdRef.current) return
        const nextError = transactionErrorMessage(cause)
        clearPreview(nextError)
        if (action === "send") {
          notification.error({ message: "Transaction could not be built", description: nextError })
        }
        return
      }

      if (action !== "send") return
      try {
        const response = await clientCardanoV1.signAndSubmitTx(txData.cbor)
        const result = response?.payload
        if (!result) throw new Error("XRAY App did not return a submission result")
        if (result.success) {
          notification.success({ message: "Transaction submitted", description: result.hash })
          return
        }
        setError(result.error)
        notification.error({ message: "Transaction was not submitted", description: result.error })
      } catch (cause: unknown) {
        const nextError = transactionErrorMessage(cause)
        setError(nextError)
        notification.error({ message: "Transaction was not submitted", description: nextError })
      }
    },
    [accountState, accountUtxos, clearPreview, decimalsList, form, sendAll, web3]
  )

  const debouncedPreview = useMemo(
    () =>
      debounce((requestId: number) => {
        void processForm("preview", requestId)
      }, 500),
    [processForm]
  )

  useEffect(
    () => () => {
      requestIdRef.current += 1
      debouncedPreview.cancel()
    },
    [debouncedPreview]
  )

  const queuePreview = useCallback(() => {
    const requestId = ++requestIdRef.current
    clearPreview()
    debouncedPreview(requestId)
  }, [clearPreview, debouncedPreview])

  const resetForm = useCallback(() => {
    requestIdRef.current += 1
    debouncedPreview.cancel()
    form.resetFields()
    form.setFieldsValue({ outputs: [{}] })
    setSelectedOption({})
    clearPreview()
  }, [clearPreview, debouncedPreview, form])

  const submitForm = useCallback(() => {
    if (submissionInFlightRef.current) return
    submissionInFlightRef.current = true
    debouncedPreview.cancel()
    const requestId = ++requestIdRef.current
    setLoading(true)
    void processForm("send", requestId).finally(() => {
      submissionInFlightRef.current = false
      setLoading(false)
    })
  }, [debouncedPreview, processForm])

  return (
    <div className="max-w-4xl mx-auto pt-5">
      {!accountState && <Alert className="mb-5" type="info" showIcon message={unavailableMessage} />}
      <Row gutter={48}>
        <Col xs={24} sm={24} md={18}>
          <div>
            <div className="flex items-center mb-5">
              <h4 className="mb-0 text-2xl font-black">Send Assets</h4>
              <div className="ms-auto mb-0 flex items-center justify-center">
                <span className="ms-3">
                  <Checkbox
                    checked={sendAll}
                    disabled={loading}
                    onChange={(e) => {
                      resetForm()
                      setSendAll(e.target.checked)
                    }}
                  >
                    Send All
                  </Checkbox>
                </span>
                <span
                  className="shared-link cursor-pointer ms-3 inline-flex items-center justify-center"
                  aria-disabled={loading}
                  onClick={() => {
                    if (!loading) resetForm()
                  }}
                >
                  <XMarkIcon className="size-5 me-1" strokeWidth={2.5} />
                  Reset
                </span>
              </div>
            </div>
            <Form onFinish={submitForm} form={form} layout="vertical" requiredMark={false} preserve disabled={loading}>
              <div className="p-6 bg-gray-100 dark:bg-gray-950 rounded-2xl mb-10 -mx-6 sm:mx-0">
                <Form.List name="outputs" initialValue={[{}]}>
                  {(addressFields, { add: addressAdd, remove: addressRemove }) => (
                    <>
                      {addressFields.map((addressField, index) => {
                        return (
                          <div key={addressField.key}>
                            <Form.Item>
                              <div className="flex items-center mb-2">
                                <strong>
                                  <span>To Address</span>
                                </strong>
                                {addressField.key > 0 && (
                                  <a
                                    onClick={() => {
                                      addressRemove(addressField.name)
                                      queuePreview()
                                    }}
                                    className="ms-auto flex items-center shared-link cursor-pointer"
                                  >
                                    <XMarkIcon className="size-5 me-1" strokeWidth={2.5} />
                                    <span>Remove</span>
                                  </a>
                                )}
                              </div>
                              <Form.Item
                                {...addressField}
                                key={undefined}
                                name={[addressField.name, "address"]}
                                rules={[
                                  () => ({
                                    validator(_, value) {
                                      if (value && addresses?.validateAddress(value)) {
                                        return Promise.resolve()
                                      }
                                      return Promise.reject(new Error("Address is wrong"))
                                    },
                                  }),
                                ]}
                                noStyle
                              >
                                <Input
                                  size="large"
                                  placeholder="Cardano Address"
                                  allowClear
                                  autoComplete="off"
                                  addonBefore={
                                    <span className={style.addressIndex}>
                                      {addressFields.length < 2 ? (
                                        <ArrowRightIcon className="size-5 mx-auto" strokeWidth={2.5} />
                                      ) : (
                                        index + 1
                                      )}
                                    </span>
                                  }
                                  className={style.address}
                                  onChange={queuePreview}
                                />
                              </Form.Item>
                            </Form.Item>
                            {!sendAll && (
                              <Space.Compact block className={style.assetGroup}>
                                <Form.Item className={style.assetTickerAda}>
                                  <Select size="large" disabled suffixIcon={null} value="ada">
                                    <Select.Option value="ada">
                                      <div className={style.assetInfo}>
                                        <span className={style.assetIcon}>
                                          <AssetImage assetId="ada" />
                                        </span>
                                        <span className={style.assetName}>ADA</span>
                                      </div>
                                    </Select.Option>
                                  </Select>
                                </Form.Item>
                                <Form.Item
                                  className={style.assetQuantityAda}
                                  name={[addressField.name, "value"]}
                                  initialValue=""
                                  rules={[{ required: true, message: "Required" }]}
                                >
                                  <InputNumber
                                    stringMode
                                    step="1"
                                    min="0.969750"
                                    precision={6}
                                    size="large"
                                    placeholder="0.000000"
                                    autoComplete="off"
                                    decimalSeparator="."
                                    style={{ width: "100%" }}
                                    onChange={queuePreview}
                                  />
                                </Form.Item>
                              </Space.Compact>
                            )}
                            <Form.List name={[addressField.name, "assets"]}>
                              {(assetFields, { add: assetAdd, remove: assetRemove }) => (
                                <>
                                  {assetFields.map((assetField, index) => {
                                    const formId = `${addressField.name}-${assetField.name}`
                                    const decimals = decimalsList?.[selectedOption?.[formId]!] || 0
                                    const precision = decimals
                                    const min = 1 / Math.pow(10, decimals)
                                    const step = 1
                                    const placeholder = decimals > 0 ? `0.${"0".repeat(decimals)}` : "0"
                                    return (
                                      <Space.Compact block key={assetField.key} className={style.assetGroup}>
                                        <Form.Item
                                          className={style.assetTicker}
                                          name={[assetField.name, "assetId"]}
                                          rules={[{ required: true, message: "Required" }]}
                                        >
                                          <Select
                                            size="large"
                                            placeholder="Select Asset"
                                            onChange={(value) => {
                                              setSelectedOption((current) => ({ ...current, [formId]: value }))
                                              form.setFieldValue(
                                                ["outputs", addressField.name, "assets", assetField.name, "quantity"],
                                                undefined
                                              )
                                              form.setFieldValue(
                                                ["outputs", addressField.name, "assets", assetField.name, "decimals"],
                                                decimalsList[value] || 0
                                              )
                                              queuePreview()
                                            }}
                                            onClear={() => {}}
                                            className="w-100p"
                                            suffixIcon={<i className="xi xi-chevron_down" />}
                                            notFoundContent={
                                              <Empty
                                                description="No Assets"
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                className="mt-3 mb-2"
                                              />
                                            }
                                          >
                                            {(accountAssets || []).map((asset) => {
                                              const assetId = asset.policyId + asset.assetName
                                              return (
                                                <Select.Option
                                                  key={assetId}
                                                  value={assetId}
                                                  className={style.assetOption}
                                                >
                                                  <div className={style.assetInfo}>
                                                    <span className={style.assetIcon}>
                                                      <AssetImage assetId={assetId} />
                                                    </span>
                                                    <span className={style.assetName}>
                                                      <span>
                                                        {Utils.decodeAssetName(asset.assetName)?.assetNameFinal}
                                                      </span>
                                                      <span>
                                                        {
                                                          Utils.quantityFormat(asset.quantity, asset.decimals, true)
                                                            .final
                                                        }{" "}
                                                        — {asset.fingerprint.slice(0, 9)}...
                                                        {asset.fingerprint.slice(-4)}
                                                      </span>
                                                    </span>
                                                  </div>
                                                </Select.Option>
                                              )
                                            })}
                                          </Select>
                                        </Form.Item>
                                        <Form.Item
                                          className={style.assetQuantity}
                                          name={[assetField.name, "quantity"]}
                                          rules={[{ required: true, message: "Required" }]}
                                        >
                                          <InputNumber
                                            stringMode
                                            min={min}
                                            step={step}
                                            precision={precision}
                                            decimalSeparator="."
                                            size="large"
                                            placeholder={placeholder}
                                            autoComplete="off"
                                            onChange={queuePreview}
                                            style={{ width: "100%" }}
                                          />
                                        </Form.Item>
                                        <Form.Item
                                          className={style.assetQuantity}
                                          name={[assetField.name, "decimals"]}
                                          rules={[{ required: true, message: "Required" }]}
                                          hidden
                                        >
                                          <Input />
                                        </Form.Item>
                                        <Form.Item className={style.assetRemove}>
                                          <Button
                                            className="px-0!"
                                            size="large"
                                            onClick={() => {
                                              setSelectedOption((current) => {
                                                const next = { ...current }
                                                delete next[formId]
                                                return next
                                              })
                                              assetRemove(assetField.name)
                                              queuePreview()
                                            }}
                                          >
                                            <TrashIcon className="size-4 me-0.5" strokeWidth={2} />
                                          </Button>
                                        </Form.Item>
                                      </Space.Compact>
                                    )
                                  })}
                                  {!sendAll && (
                                    <div>
                                      <Button
                                        size="large"
                                        onClick={() => {
                                          assetAdd()
                                          queuePreview()
                                        }}
                                        shape="round"
                                        className="me-2"
                                      >
                                        <PlusCircleIcon className="size-5" strokeWidth={2.5} />
                                        <strong>Add Asset</strong>
                                      </Button>
                                      {index + 1 === addressFields.length && (
                                        <Button
                                          size="large"
                                          onClick={() => {
                                            addressAdd()
                                            queuePreview()
                                          }}
                                          shape="round"
                                        >
                                          <PlusCircleIcon className="size-5" strokeWidth={2.5} />
                                          <strong>Add Address</strong>
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </Form.List>
                            {index + 1 < addressFields.length && (
                              <div className="shared-line shared-line-dashed my-5" />
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </Form.List>
              </div>
              {error && <Alert showIcon className="my-4" type="error" message={error} />}
              {!error && (
                <Row gutter={24}>
                  <Col xs={24} sm={12}>
                    <div className="xray-box mb-3">
                      <div className="xray-box-inner">
                        <Informers.Breakdown
                          compact
                          items={[
                            {
                              title: sendAll ? "Recipient Receives" : "Send Subtotal",
                              children: (
                                <span className="font-size-16">
                                  <Informers.Ada value={flattenedOutputs?.value || "0"} sameSize />
                                </span>
                              ),
                            },
                            ...(flattenedOutputs?.assets.length
                              ? flattenedOutputs?.assets.map((asset) => {
                                  return {
                                    children: (
                                      <span className="font-size-16">
                                        <Informers.Asset
                                          policyId={asset.policyId}
                                          assetName={asset.assetName}
                                          quantity={asset.quantity}
                                          decimals={asset.decimals}
                                        />
                                      </span>
                                    ),
                                  }
                                })
                              : []),
                          ]}
                        />
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="xray-box xray-box-bg mb-3">
                      <div className="xray-box-inner">
                        <Informers.Breakdown
                          compact
                          items={[
                            {
                              title: "Tx Fee",
                              children: (
                                <span className="font-size-16">
                                  <Informers.Ada value={transactionFee} sameSize />
                                </span>
                              ),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
              <Form.Item>
                <Button
                  htmlType="submit"
                  size="large"
                  type="primary"
                  shape="round"
                  disabled={!accountState || !validated || loading}
                  className="mt-5"
                  loading={loading}
                  block
                >
                  <PaperAirplaneIcon className="size-5" strokeWidth={2.5} />
                  <strong>Send</strong>
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
        <Col xs={24} sm={24} md={6}>
          <div className="pt-6 md:pt-1">
            <Row gutter={48}>
              <Col xs={12} sm={12} md={24}>
                <div className="mb-5">
                  <strong>From Address</strong>
                </div>
                {/* <div className="mb-5">
                  <div className="h-25 w-25 bg-gray-950">
                    <QRCode
                      size={256}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      value={accountState?.paymentAddress || ""}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                </div> */}
                <div className="mb-3">
                  <Informers.Explorer value={accountState?.paymentAddress} type="paymentAddress" />
                </div>
                <div className="mb-5">
                  <div className="text-xl">
                    <Informers.Ada value={accountState?.state?.balance.value || 0n} />
                  </div>
                  {!!accountState?.state?.balance.assets.length && (
                    <div>+ {accountState.state.balance.assets.length} Assets</div>
                  )}
                </div>
              </Col>
              <Col xs={12} sm={12} md={24}>
                <div className="shared-line shared-line-dashed mb-5 hidden md:block" />
                <div className="mb-5">
                  <ShieldCheckIcon className="size-15 text-green-500 me-2" strokeWidth={2} />
                </div>
                <div className="text-gray-500 text-sm">
                  All Cardano payments are protected with advanced blockchain encryption, multi-layer authentication,
                  and decentralized verification, ensuring your ADA transactions remain private, tamper-proof, and fully
                  secure.
                </div>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default memo(HomePage)
