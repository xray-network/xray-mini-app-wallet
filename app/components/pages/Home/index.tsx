import { useCallback, useState, memo } from "react"
import { Checkbox, Form, Input, InputNumber, Button, Select, Empty, Alert, Space, Col, Row } from "antd"
import QRCode from "react-qr-code"
import { useAppStore } from "@/store/app"
import { useWeb3Store } from "@/store/web3"
import style from "./style.module.css"
import { useMiniAppClientMessaging } from "xray-mini-app-sdk-react"
import { debounce } from "lodash"
import Informers from "@/components/informers"
import AssetImage from "@/components/common/AssetImage"
import * as UtilsTxCw3 from "@/utils/txCw3"
import * as Utils from "@/utils"
import { message, notification } from "@/utils/escapeAntd"
import {
  ArrowRightIcon,
  TrashIcon,
  PlusCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline"

export const HomePage = () => {
  const web3 = useWeb3Store((state) => state.web3)
  const web3utils = useWeb3Store((state) => state.utils)
  const network = useAppStore((state) => state.network)
  const accountState = useAppStore((state) => state.accountState)

  const accountAssets = accountState?.state?.balance?.assets || []
  const accountUtxos = accountState?.state?.utxos || []

  const decimalsList = accountState?.state?.balance.assets.reduce(
    (acc, asset) => {
      acc[asset.policyId + asset.assetName] = asset.decimals || 0
      return acc
    },
    {} as { [key: string]: number }
  )

  const { sendMessage } = useMiniAppClientMessaging(() => {})

  const [form] = Form.useForm()
  const [sendAll, setSendAll] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{ [key: string]: string }>({})
  const [validated, setValidated] = useState(true)
  const [transactionData, setTransactionData] = useState<ReturnType<typeof UtilsTxCw3.parseJsonTx>>()
  const [flattenedOutputs, setFlattenedOutputs] = useState<ReturnType<typeof UtilsTxCw3.flattenOutputs>>()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    form.resetFields()
    form.setFieldsValue({ outputs: [{}] })
    setSelectedOption({})
    setValidated(true)
    setTransactionData(undefined)
    setFlattenedOutputs(undefined)
    setError("")
  }

  const processForm = (action?: string) => {
    form.validateFields()
    setTimeout(async () => {
      if (!!form.getFieldsError().filter(({ errors }) => errors.length).length) {
        setValidated(false)
        setTransactionData(undefined)
        setFlattenedOutputs(undefined)
        return
      } else {
        setValidated(true)
      }

      const values = form.getFieldsValue()
      const outputs = sendAll ? accountUtxos : UtilsTxCw3.formValuesToOutputs(values.outputs)

      if (outputs.length && accountState && web3) {
        try {
          const tx = sendAll
            ? await web3.createTx().addInputs(accountUtxos).setChangeAddress(outputs[0].address).applyAndBuild()
            : await web3
                .createTx()
                .addInputs(accountUtxos)
                .addOutputs(outputs)
                .setChangeAddress(accountState.paymentAddress)
                .applyAndBuild()

          const txData = await tx.applyAndToJson()
          const transactionData = UtilsTxCw3.parseJsonTx(txData.json)

          // Get decimals from account utxos
          accountUtxos.forEach((utxo) => {
            transactionData.outputs.forEach((output) => {
              output.assets.forEach((asset) => {
                const utxoAsset = utxo.assets.find(
                  (a) => a.policyId === asset.policyId && a.assetName === asset.assetName
                )
                if (utxoAsset) {
                  asset.decimals = utxoAsset.decimals
                }
              })
            })
          })

          // Flatten outputs
          const flattenedOutputs = UtilsTxCw3.flattenOutputs(sendAll ? transactionData.outputs : outputs)
          setTransactionData(transactionData)
          setFlattenedOutputs(flattenedOutputs)

          setError("")

          if (action === "send") {
            // setLoading(true) // TODO: create ping-pong submitting state in xray-mini-app-sdk-react
            sendMessage("xray.client.submitTx", {
              tx: txData.tx,
            })
          }
        } catch (error: any) {
          try {
            if (typeof error === "object") {
              if (error.message) {
                if (error.message.includes("less tan the minimum UTXO value")) {
                  return setError(
                    "Requirement to send assets: " +
                      error.message
                        .replace(/\'/g, "")
                        .split(/(\d+)/)
                        .map((item: string) => {
                          const number = parseInt(item, 10)
                          return Number.isNaN(number) ? item : `${(number / 1000000).toFixed(6)} ADA`
                        })
                        .join(" ")
                  )
                }
                if (error.message.includes("UTxO Balance Insufficient")) {
                  return setError("Transaction error: Insufficient funds")
                }
              }
            }
            setError("Transaction error: Invalid transaction or insufficient funds")
          } catch (error: any) {
            setError("Transaction error: Invalid transaction or insufficient funds")
          }
        }
      }
    })
  }

  return (
    <div className="max-w-256 mx-auto pt-5">
      <Row gutter={48}>
        <Col xs={24} sm={24} md={18}>
          <div>
            <div className="flex items-center mb-5">
              <h4 className="mb-0 text-2xl font-black">Send Assets</h4>
              <div className="ms-auto mb-0 flex items-center justify-center">
                <span className="ms-3">
                  <Checkbox
                    checked={sendAll}
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
                  onClick={resetForm}
                >
                  <XMarkIcon className="size-5 me-1" strokeWidth={2.5} />
                  Reset
                </span>
              </div>
            </div>
            <Form onFinish={() => processForm("send")} form={form} layout="vertical" requiredMark={false} preserve>
              <div className="p-6 bg-gray-100 dark:bg-gray-950 rounded-2xl mb-10 -mx-6 sm:-mx-0">
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
                                      processForm()
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
                                      if (value && web3utils?.address.validateAddress(value)) {
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
                                  onChange={debounce(processForm, 500) as any}
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
                                    onChange={debounce(processForm, 500) as any}
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
                                              setTimeout(() => {
                                                setSelectedOption({
                                                  ...selectedOption,
                                                  [formId]: value,
                                                })
                                                form.setFieldValue(
                                                  ["outputs", addressField.name, "assets", assetField.name, "quantity"],
                                                  undefined
                                                )
                                                form.setFieldValue(
                                                  ["outputs", addressField.name, "assets", assetField.name, "decimals"],
                                                  decimalsList?.[value] || 0
                                                )
                                                processForm()
                                              })
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
                                            onChange={debounce(processForm, 500) as any}
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
                                              delete selectedOption[formId]
                                              setSelectedOption(selectedOption)
                                              assetRemove(assetField.name)
                                              setTimeout(() => {
                                                processForm()
                                              })
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
                                      <Button size="large" onClick={() => assetAdd()} shape="round" className="me-2">
                                        <PlusCircleIcon className="size-5" strokeWidth={2.5} />
                                        <strong>Add Asset</strong>
                                      </Button>
                                      {index + 1 === addressFields.length && (
                                        <Button size="large" onClick={() => addressAdd()} shape="round">
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
                              title: "Send Subtotal",
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
                              title: "+ Tx Fee",
                              children: (
                                <span className="font-size-16">
                                  <Informers.Ada value={transactionData?.fee || "0"} sameSize />
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
                  disabled={!accountState || !!error || !validated}
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
                <div className="mb-5">
                  <div className="h-25 w-25 bg-gray-950">
                    <QRCode
                      size={256}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      value={accountState?.paymentAddress || ""}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                </div>
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
