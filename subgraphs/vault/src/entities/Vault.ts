import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS, MTR_ADDRESS, VAULT_MANAGER_ADDRESS } from 'const'
import { Vault, VaultHistory } from '../../generated/schema'
import { getCDP } from './CDP'
import { getUser } from './User'

export function createVault(
  index: BigInt,
  address: Address,
  collateral: Address,
  owner: Address,
  block: ethereum.Block
): Vault {
  let vault = Vault.load(index.toString())

  if (vault === null) {
    vault = new Vault(index.toString())

    vault.manager = VAULT_MANAGER_ADDRESS.toHex()

    vault.stablecoin = MTR_ADDRESS
    vault.address = address

    vault.collectedStabilityFee = BIG_DECIMAL_ZERO

    const user = getUser(owner, block)
    vault.user = user.id

    const cdp = getCDP(collateral)
    vault.CDP = cdp.id
    vault.isClosed = false
    vault.isLiquidated = false

    vault.currentBorrowed = BIG_DECIMAL_ZERO
    vault.historicBorrowed = BIG_DECIMAL_ZERO
    vault.currentCollateralized = BIG_DECIMAL_ZERO
    vault.historicCollateralized = BIG_DECIMAL_ZERO
    vault.historicPaidBack = BIG_DECIMAL_ZERO

    vault.collateral = collateral

    vault.lastPaidBack = block.timestamp
    vault.createdAt = block.timestamp

    vault.numId = index
  }

  vault.block = block.number
  vault.timestamp = block.timestamp

  vault.save()

  return vault as Vault
}

export function getVault(index: BigInt, block: ethereum.Block): Vault {
  let vault = Vault.load(index.toString())

  vault.block = block.number
  vault.timestamp = block.timestamp

  vault.save()

  return vault as Vault
}

export function updateVaultHistory(index: BigInt, block: ethereum.Block): VaultHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const vault = getVault(index, block)
  const id = vault.id.concat('-').concat(date.toString())

  let history = VaultHistory.load(id)

  if (history === null) {
    history = new VaultHistory(id)
    history.date = date
  }

  history.vault = vault.id
  history.user = vault.user

  history.collectedStabilityFee = vault.collectedStabilityFee

  history.isClosed = vault.isClosed
  history.isLiquidated = vault.isLiquidated

  history.currentBorrowed = vault.currentBorrowed
  history.historicBorrowed = vault.historicBorrowed

  history.currentCollateralized = vault.currentCollateralized
  history.historicCollateralized = vault.historicCollateralized
  history.historicPaidBack = vault.historicPaidBack

  history.block = block.number
  history.timestamp = block.timestamp

  history.save()

  return history as VaultHistory
}
