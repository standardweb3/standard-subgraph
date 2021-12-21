import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO } from "const";
import { CollateralVault } from "../../generated/schema";

export function getCollateralVault(collateral: Address, block: ethereum.Block): CollateralVault {
    let vault = CollateralVault.load(collateral.toHex())

    if (vault === null) {
        vault = new CollateralVault(collateral.toHex())

        vault.collateral = collateral
        vault.historicBorrowed = BIG_DECIMAL_ZERO
        vault.currentBorrowed = BIG_DECIMAL_ZERO
        vault.historicPaidBack = BIG_DECIMAL_ZERO
        vault.currentCollateralized = BIG_DECIMAL_ZERO
        vault.historicCollateralized = BIG_DECIMAL_ZERO

        vault.historicVaultCount = BIG_INT_ZERO
        vault.activeVaultCount = BIG_INT_ZERO

        vault.collectedStabilityFee = BIG_DECIMAL_ZERO
    }

    vault.block = block.number
    vault.timestamp = block.timestamp
    
    vault.save()

    return vault as CollateralVault
}