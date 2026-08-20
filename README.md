# xray-mini-app-cardano-wallet

The mini app uses the direct, versioned XRAY bridge namespaces. Platform status and preferences come
from `platformV1`, while Cardano account data and transaction submission use `cardanoV1` and
`clientCardanoV1`; calls do not require a handshake.
