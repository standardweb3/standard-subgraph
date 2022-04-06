import { CDPInitialized, VaultCreated } from '../generated/VaultManager/VaultManager'
import { Vault as VaultTemplate } from '../generated/templates'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { Vault } from '../generated/schema'
import { getCDP } from './cdp'

export function handleNewVault(
    index: BigInt,
    collateral: Address,
): Vault {
    let vault = new Vault(index.toString())
    vault.collateral = collateral
    vault.save()
    return vault as Vault
}

export function onVaultCreated(event: VaultCreated): void {
    const vault = handleNewVault(event.params.vaultId, event.params.collateral)
    VaultTemplate.create(event.params.vault)
}

export function onCDPInitialized(event: CDPInitialized): void {
    getCDP(event.params.collateral)
}