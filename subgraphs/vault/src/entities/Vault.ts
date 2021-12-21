import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ONE, MTR_ADDRESS, V1_ADDRESS, VAULT_MANAGER_ADDRESS } from "const";
import { Vault } from "../../generated/schema";
import { getCDP } from "./CDP";
import { getUser } from "./User";

export function createVault(index: BigInt, address: Address, collateral: Address, owner: Address, block: ethereum.Block): Vault {
    let vault  = Vault.load(index.toString())

    if (vault === null) {       
        vault = new Vault(index.toString())

        vault.manager = VAULT_MANAGER_ADDRESS.toHex()
        
        vault.stablecoin = MTR_ADDRESS
        vault.address = address;

        vault.collectedStabilityFee = BIG_DECIMAL_ZERO

        const user = getUser(owner, block)
        vault.user = user.id

        const cdp = getCDP(collateral)
        vault.CDP = cdp.id
        vault.isClosed = false
        vault.isLiquidated = false

        vault.currentBorrowed = BIG_DECIMAL_ZERO
        vault.historicBorrowed = BIG_DECIMAL_ZERO
        vault.currrentCollateralized = BIG_DECIMAL_ZERO
        vault.historicCollateralized = BIG_DECIMAL_ZERO
        vault.historicPaidBack = BIG_DECIMAL_ZERO

        vault.collateral = collateral
    }

    vault.block = block.number
    vault.timestamp = block.timestamp

    vault.save()

    return vault as Vault
}


export function getVault(index: BigInt, block: ethereum.Block): Vault {
    let vault  = Vault.load(index.toString())

    vault.block = block.number
    vault.timestamp = block.timestamp

    vault.save()

    return vault as Vault
}