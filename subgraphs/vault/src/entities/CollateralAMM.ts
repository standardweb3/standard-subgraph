import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS } from "const";
import { CollateralAMM, CollateralAMMHistory } from "../../generated/schema";
import { getAssetPrice } from "../utils/vaultManager";

export function getCollateralAMM(collateral: Address, block: ethereum.Block): CollateralAMM {
    let amm = CollateralAMM.load(collateral.toHex())

    if (amm === null) {
        amm = new CollateralAMM(collateral.toHex())

        amm.reserveCollateral = BIG_DECIMAL_ZERO
        amm.reserveCollateralUSD = BIG_DECIMAL_ZERO
        amm.reserveStablecoin = BIG_DECIMAL_ZERO
        amm.reserveStablecoinUSD = BIG_DECIMAL_ZERO
    }

    amm.block = block.number
    amm.timestamp = block.timestamp

    amm.save

    return amm as CollateralAMM
}

export function getCollateralAMMHistory(collateral: Address, block: ethereum.Block) : CollateralAMMHistory {
    const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
    const amm = getCollateralAMM(collateral, block)
    const id = amm.id.concat('-').concat(date.toString())

    let history = CollateralAMMHistory.load(id)

    if (history === null) {
        history = new CollateralAMMHistory(id)

        history.date = date;
        history.reserveStablecoin = amm.reserveStablecoin
        // change later to oracle fed price of MTR
        history.reserveStablecoinUSD = amm.reserveStablecoin
        history.reserveCollateral = amm.reserveCollateral

        history.reserveCollateralUSD = amm.reserveCollateralUSD
    }

    history.block = block.number
    history.timestamp = block.timestamp

    history.save()

    return history as CollateralAMMHistory
}

