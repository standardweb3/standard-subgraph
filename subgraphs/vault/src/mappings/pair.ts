import { dataSource } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E18 } from 'const'
import { Sync } from '../../generated/Factory/Pair'
import { CDP, Pair } from '../../generated/schema'
import { getPairDayData } from '../entities/Pair'

export function onSync(event: Sync): void {
  const pair = Pair.load(dataSource.address().toHex())

  if (pair.isToken0Mtr) {
    let cdp = CDP.load(pair.token1)
    pair.collateralReserve = event.params.reserve1.toBigDecimal().div(cdp.decimals)

    pair.reserve0 = event.params.reserve0.toBigDecimal().div(BIG_DECIMAL_1E18)
    pair.reserve1 = pair.collateralReserve
  } else {
    let cdp = CDP.load(pair.token0)
    pair.collateralReserve = event.params.reserve0.toBigDecimal().div(cdp.decimals)
    
    pair.reserve0 = pair.collateralReserve
    pair.reserve1 = event.params.reserve1.toBigDecimal().div(BIG_DECIMAL_1E18)
  }

  pair.save()

  getPairDayData(dataSource.address(), event.block)
}
