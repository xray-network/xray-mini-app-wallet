import { useAppStore } from "@/store/app"

const AssetImage = ({
  assetId,
  size = "64",
}: {
  assetId: string
  size?: "original" | "64" | "128" | "256" | "512" | "1024" | "2048"
}) => {
  const network = useAppStore((state) => state.network)
  const url =
    assetId === "ada"
      ? `/resources/icons/cardano.png`
      : `https://graph.xray.app/output/services/nftcdn/${network}/api/v1/image/${assetId}?size=${size}&prefer=cip26`
  return <img src={url} />
}

export default AssetImage
