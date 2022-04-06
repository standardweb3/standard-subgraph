import { Address, BigDecimal, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO } from 'const'
import { ERC20 } from '../generated/VaultManager/ERC20'
import { CDP } from '../generated/schema'

export function getCDP(collateral: Address): CDP {
  let cdp = CDP.load(collateral.toHex())

  if (cdp === null) {
    cdp = new CDP(collateral.toHex())
    cdp.decimals = BIG_DECIMAL_ZERO
  }

  cdp.save()

  // always goes first if
  if (cdp.decimals.equals(BIG_DECIMAL_ZERO)) {
    return getCDPWithDecimals(collateral)
  } else {
    return cdp as CDP
  }
}

export function getCDPWithDecimals(collateral: Address): CDP {
  let cdp = CDP.load(collateral.toHex())
  log.info('collateral bind {}', [collateral.toHex()])

  const contract = ERC20.bind(collateral)
  const decimals = contract.try_decimals()
  if (!decimals.reverted) {
    cdp.decimals = BigDecimal.fromString('1'.concat('0'.repeat(decimals.value)))
  }

  cdp.save()

  return cdp as CDP
}
