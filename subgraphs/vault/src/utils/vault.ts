import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E8, BIG_DECIMAL_ZERO, VAULT_MANAGER_ADDRESS } from 'const'
import { VaultManager } from '../../generated/schema'
import { Vault as VaultContract } from '../../generated/VaultManager/Vault'

export function getDebt(vault: Address): BigDecimal {
  const contract = VaultContract.bind(vault)

  const debt = contract.try_outstandingPayment()

  if (!debt.reverted) {
    return debt.value.toBigDecimal().div(BIG_DECIMAL_1E8)
  }

  return BIG_DECIMAL_ZERO
}
