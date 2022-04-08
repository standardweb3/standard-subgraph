import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS } from 'const'
import { CollateralPairMapper, Pair, PairDayData } from '../../generated/schema'
import { Pair as PairContract } from '../../generated/templates/Pair/Pair'
import { getSymbol } from '../functions'
import { Pair as PairTemplate } from '../../generated/templates'

export function createPair(
  address: Address,
  block: ethereum.Block = null,
  token0FromParams: Address = null,
  token1FromParams: Address = null,
  isToken0Mtr: boolean = false,
  isOpen: boolean = false
): Pair | null {
  let pair = Pair.load(address.toHex())

  if (pair === null) {
    const pairContract = PairContract.bind(address)

    const token0Address = token0FromParams || pairContract.token0()
    const token0 = token0Address

    if (token0 === null) {
      return null
    }

    const token1Address = token1FromParams || pairContract.token1()
    const token1 = token1Address

    if (token1 === null) {
      return null
    }

    pair = new Pair(address.toHex())

    pair.address = address.toHex()

    pair.isToken0Mtr = isToken0Mtr
    pair.symbolToken0 = getSymbol(token0Address)
    pair.symbolToken1 = getSymbol(token1Address)
    if (pair.isToken0Mtr) {
      pair.collateralSymbol = pair.symbolToken1
    } else {
      pair.collateralSymbol = pair.symbolToken0
    }

    pair.token0 = token0.toHex()
    pair.token1 = token1.toHex()

    if (isToken0Mtr) {
      pair.collateral = pair.token1
    } else {
      pair.collateral = pair.token0
    }

    pair.reserve0 = BIG_DECIMAL_ZERO
    pair.reserve1 = BIG_DECIMAL_ZERO
    pair.collateralReserve = BIG_DECIMAL_ZERO
    pair.isOpen = isOpen
  }

  pair.timestamp = block.timestamp
  pair.block = block.number
  pair.save()

  PairTemplate.create(address)

  getPairDayData(address, block)
  return pair as Pair
}

export function getPairDayData(address: Address, block: ethereum.Block): PairDayData {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const pair = Pair.load(address.toHex())
  const id = pair.id.concat('-').concat(date.toString())

  let dayData = PairDayData.load(id)

  if (dayData === null) {
    dayData = new PairDayData(id)
    dayData.date = date
    dayData.pair = pair.id
  }

  dayData.collateral = pair.collateral
  dayData.reserve0 = pair.reserve0
  dayData.reserve1 = pair.reserve1
  dayData.collateralReserve = pair.collateralReserve

  dayData.timestamp = block.timestamp
  dayData.block = block.number

  dayData.save()

  return dayData as PairDayData
}

export function createCollateralPairMapper(
  pairAddress: Address,
  collateralAddress: Address,
): void {
  const pairCollateralMapper = new CollateralPairMapper(collateralAddress.toHex())
  pairCollateralMapper.pair = pairAddress.toHex()
  pairCollateralMapper.save()
}