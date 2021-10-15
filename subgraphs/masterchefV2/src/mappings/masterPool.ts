import {
  Deposit,
  Withdraw,
  EmergencyWithdraw,
  Harvest,
  LogPoolAddition,
  LogSetPool,
  LogUpdatePool,
  LogUpdateReward,
  OwnershipTransferred
} from '../../generated/MasterPool/MasterPool'
import { Pair as PairContract } from '../../generated/MasterPool/Pair';
// import { MasterPool as MasterChefContract } from '../../generated/MasterPool/MasterPool'

import { Address, BigDecimal, BigInt, dataSource, ethereum, log } from '@graphprotocol/graph-ts'
import {
  // BIG_DECIMAL_1E12,
  BIG_DECIMAL_1E18,
  // BIG_DECIMAL_ZERO,
  BIG_INT_ONE,
  // BIG_INT_ONE_DAY_SECONDS,
  BIG_INT_ZERO,
  MASTER_CHEF_V2_ADDRESS,
  ACC_SUSHI_PRECISION,
  // MASTER_CHEF_START_BLOCK,
  // MASTER_CHEF_V2_START_BLOCK
} from 'const'
// import { MasterChef, Pool, User, Rewarder } from '../../generated/schema'
import { getSushiPrice, getUSDRate } from 'pricing'

import {
  getHistory,
  getMasterChef,
  getPool,
  getPoolHistory,
  getRewarder,
  getUser,
  updateRewarder
} from '../entities'

// import { ERC20 as ERC20Contract } from '../../generated/MasterPool/ERC20'

export function logPoolAddition(event: LogPoolAddition): void {
  log.info('[MasterChefV2] Log Pool Addition {} {} {} {}', [
    event.params.pid.toString(),
    event.params.allocPoint.toString(),
    event.params.lpToken.toHex(),
    event.params.rewarder.toHex()
  ])

  const masterChef = getMasterChef(event.block)
  const pool = getPool(event.params.pid, event.block)
  const rewarder = getRewarder(event.params.rewarder, event.block)

  pool.pair = event.params.lpToken
  pool.rewarder = rewarder.id
  pool.allocPoint = event.params.allocPoint
  pool.save()

  masterChef.totalAllocPoint = masterChef.totalAllocPoint.plus(pool.allocPoint)
  masterChef.poolCount = masterChef.poolCount.plus(BIG_INT_ONE)
  masterChef.save()
}

export function logSetPool(event: LogSetPool): void {
  log.info('[MasterChefV2] Log Set Pool {} {} {} {}', [
    event.params.pid.toString(),
    event.params.allocPoint.toString(),
    event.params.rewarder.toHex(),
    event.params.overwrite == true ? 'true' : 'false'
  ])

  const masterChef = getMasterChef(event.block)
  const pool = getPool(event.params.pid, event.block)

  if (event.params.overwrite == true) {
     const rewarder = getRewarder(event.params.rewarder, event.block)
     pool.rewarder = rewarder.id
  }

  masterChef.totalAllocPoint = masterChef.totalAllocPoint.plus(event.params.allocPoint.minus(pool.allocPoint))
  masterChef.save()

  pool.allocPoint = event.params.allocPoint
  pool.save()
}

export function logUpdatePool(event: LogUpdatePool): void {
  log.info('[MasterChefV2] Log Update Pool {} {} {} {}', [
    event.params.pid.toString(),
    event.params.lastRewardBlock.toString(),
    event.params.lpSupply.toString(),
    event.params.accSushiPerShare.toString()
  ])

  const masterChef = getMasterChef(event.block)
  const pool = getPool(event.params.pid, event.block)
  updateRewarder(Address.fromString(pool.rewarder))

  pool.accSushiPerShare = event.params.accSushiPerShare
  pool.lastRewardBlock = event.params.lastRewardBlock
  pool.save()
}

export function deposit(event: Deposit): void {
  log.info('[MasterChefV2] Log Deposit {} {} {} {}', [
    event.params.user.toHex(),
    event.params.pid.toString(),
    event.params.amount.toString(),
    event.params.to.toHex()
  ])
  // const masterChef = getMasterChef(event.block)
  // v1
  const user = getUser(event.params.to, event.params.pid, event.block)
  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)

  const pool = getPool(event.params.pid, event.block)
  const poolHistory = getPoolHistory(pool, event.block)

  // update slp balance and deposited
  pool.slpBalance = pool.slpBalance.plus(event.params.amount)
  pool.slpBalanceDecimal = pool.slpBalanceDecimal.plus(amount)
  pool.slpDeposited = pool.slpDeposited.plus(amount)

  // update slp age
  const poolDays = pool.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  pool.slpAge = pool.slpAge.plus(poolDays.times(pool.slpBalanceDecimal))

  pool.updatedAt = pool.timestamp

  // get user

  // If not currently in pool and depositing SLP
  if (!user.pool && event.params.amount.gt(BIG_INT_ZERO)) {
    user.pool = pool.id
    pool.userCount = pool.userCount.plus(BIG_INT_ONE)
  }

  // const userBalance = pairContract.balanceOf(user.address as Address)

  user.amount = user.amount.plus(event.params.amount)
  user.rewardDebt = user.rewardDebt.plus(event.params.amount.times(pool.accSushiPerShare).div(ACC_SUSHI_PRECISION))

  if (event.params.amount.gt(BIG_INT_ZERO)) {
    const pairContract = PairContract.bind(pool.pair as Address)

    const reservesResult = pairContract.try_getReserves()
    if (!reservesResult.reverted) {
      const totalSupply = pairContract.totalSupply()

      const share = amount.div(totalSupply.toBigDecimal())

      const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)
      const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)

      const token0PriceUSD = getUSDRate(pairContract.token0(), event.block)
      const token1PriceUSD = getUSDRate(pairContract.token1(), event.block)

      const token0USD = token0Amount.times(token0PriceUSD)
      const token1USD = token1Amount.times(token1PriceUSD)

      const entryUSD = token0USD.plus(token1USD)

      // log.info(
      //   'Token {} priceUSD: {} reserve: {} amount: {} / Token {} priceUSD: {} reserve: {} amount: {} - slp amount: {} total supply: {} share: {}',
      //   [
      //     token0.symbol(),
      //     token0PriceUSD.toString(),
      //     reservesResult.value.value0.toString(),
      //     token0Amount.toString(),
      //     token1.symbol(),
      //     token1PriceUSD.toString(),
      //     reservesResult.value.value1.toString(),
      //     token1Amount.toString(),
      //     amount.toString(),
      //     totalSupply.toString(),
      //     share.toString(),
      //   ]
      // )

      // log.info('User {} has deposited {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
      //   user.address.toHex(),
      //   amount.toString(),
      //   token0Amount.toString(),
      //   token0.symbol(),
      //   token0USD.toString(),
      //   token1Amount.toString(),
      //   token1.symbol(),
      //   token1USD.toString(),
      //   entryUSD.toString(),
      // ])

      user.entryUSD = user.entryUSD.plus(entryUSD)

      pool.entryUSD = pool.entryUSD.plus(entryUSD)

      poolHistory.entryUSD = pool.entryUSD
    }
  }

  user.save()
  pool.save()

  const masterChef = getMasterChef(event.block)

  const masterChefDays = event.block.timestamp.minus(masterChef.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  masterChef.slpAge = masterChef.slpAge.plus(masterChefDays.times(masterChef.slpBalanceDecimal))

  masterChef.slpDeposited = masterChef.slpDeposited.plus(amount)
  masterChef.slpBalanceDecimal = masterChef.slpBalanceDecimal.plus(amount)

  masterChef.updatedAt = event.block.timestamp
  masterChef.save()

  const history = getHistory(MASTER_CHEF_V2_ADDRESS.toHex(), event.block)
  history.slpAge = masterChef.slpAge
  history.slpBalanceDecimal = masterChef.slpBalanceDecimal
  history.slpDeposited = history.slpDeposited.plus(amount)
  history.save()

  poolHistory.slpAge = pool.slpAge
  poolHistory.slpBalanceDecimal = pool.slpBalanceDecimal
  poolHistory.slpDeposited = poolHistory.slpDeposited.plus(amount)
  poolHistory.userCount = pool.userCount
  poolHistory.save()
}

export function withdraw(event: Withdraw): void {
  log.info('[MasterChefV2] Log Withdraw {} {} {} {}', [
    event.params.user.toHex(),
    event.params.pid.toString(),
    event.params.amount.toString(),
    event.params.to.toHex()
  ])

  // const masterChef = getMasterChef(event.block)
  const user = getUser(event.params.user, event.params.pid, event.block)
  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)

  const pool = getPool(event.params.pid, event.block)
  const poolHistory = getPoolHistory(pool, event.block)

  const poolDays = pool.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  const poolAge = pool.slpAge.plus(poolDays.times(pool.slpBalanceDecimal))
  const poolAgeRemoved = poolAge.div(pool.slpBalanceDecimal).times(amount)

  pool.slpAge = poolAge.minus(poolAgeRemoved)
  pool.slpAgeRemoved = pool.slpAgeRemoved.plus(poolAgeRemoved)
  pool.slpWithdrawn = pool.slpWithdrawn.plus(amount)
  pool.slpBalance = pool.slpBalance.minus(event.params.amount)
  pool.slpBalanceDecimal = pool.slpBalanceDecimal.minus(amount)
  pool.updatedAt = pool.timestamp

  // const pairContract = PairContract.bind(pool.pair as Address)

  // const userBalance = pairContract.balanceOf(user.address as Address)
  const prevUserAmount = user.amount

  user.amount = user.amount.minus(event.params.amount)
  user.rewardDebt = user.rewardDebt.minus(event.params.amount.times(pool.accSushiPerShare).div(ACC_SUSHI_PRECISION))

  if (event.params.amount.gt(BIG_INT_ZERO)) {
    const pairContract = PairContract.bind(pool.pair as Address)

    const reservesResult = pairContract.try_getReserves()

    if (!reservesResult.reverted) {
      const totalSupply = pairContract.totalSupply()

      const share = amount.div(totalSupply.toBigDecimal())

      const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)
      const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)

      const token0PriceUSD = getUSDRate(pairContract.token0(), event.block)
      const token1PriceUSD = getUSDRate(pairContract.token1(), event.block)

      const token0USD = token0Amount.times(token0PriceUSD)
      const token1USD = token1Amount.times(token1PriceUSD)

      const exitUSD = token0USD.plus(token1USD)

      pool.exitUSD = pool.exitUSD.plus(exitUSD)
      poolHistory.exitUSD = pool.exitUSD

      // log.info('User {} has withdrwn {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
      //   user.address.toHex(),
      //   amount.toString(),
      //   token0Amount.toString(),
      //   token0USD.toString(),
      //   pairContract.token0().toHex(),
      //   token1Amount.toString(),
      //   token1USD.toString(),
      //   pairContract.token1().toHex(),
      //   exitUSD.toString(),
      // ])

      user.exitUSD = user.exitUSD.plus(exitUSD)
    } else {
      log.info("Withdraw couldn't get reserves for pair {}", [pool.pair.toHex()])
    }
  }
  // If SLP amount equals zero, remove from pool and reduce userCount
  if (user.amount.equals(BIG_INT_ZERO)) {
    user.pool = null
    pool.userCount = pool.userCount.minus(BIG_INT_ONE)
  }

  user.save()
  pool.save()

  const masterChef = getMasterChef(event.block)

  const days = event.block.timestamp.minus(masterChef.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  const slpAge = masterChef.slpAge.plus(days.times(masterChef.slpBalanceDecimal))
  const slpAgeRemoved = slpAge.div(masterChef.slpBalanceDecimal).times(amount)
  masterChef.slpAge = slpAge.minus(slpAgeRemoved)
  masterChef.slpAgeRemoved = masterChef.slpAgeRemoved.plus(slpAgeRemoved)

  masterChef.slpWithdrawn = masterChef.slpWithdrawn.plus(amount)
  masterChef.slpBalanceDecimal = masterChef.slpBalanceDecimal.minus(amount)
  masterChef.updatedAt = event.block.timestamp
  masterChef.save()

  const history = getHistory(MASTER_CHEF_V2_ADDRESS.toHex(), event.block)
  history.slpAge = masterChef.slpAge
  history.slpAgeRemoved = history.slpAgeRemoved.plus(slpAgeRemoved)
  history.slpBalanceDecimal = masterChef.slpBalanceDecimal
  history.slpWithdrawn = history.slpWithdrawn.plus(amount)
  history.save()

  poolHistory.slpAge = pool.slpAge
  poolHistory.slpAgeRemoved = poolHistory.slpAgeRemoved.plus(slpAgeRemoved)
  poolHistory.slpBalanceDecimal = pool.slpBalance.divDecimal(BIG_DECIMAL_1E18)
  poolHistory.slpWithdrawn = poolHistory.slpWithdrawn.plus(amount)
  poolHistory.userCount = pool.userCount
  poolHistory.save()
}

export function emergencyWithdraw(event: EmergencyWithdraw): void {
  log.info('[MasterChefV2] Log Emergency Withdraw {} {} {} {}', [
    event.params.user.toHex(),
    event.params.pid.toString(),
    event.params.amount.toString(),
    event.params.to.toHex()
  ])

  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)

  const pool = getPool(event.params.pid, event.block)
  pool.slpBalance = pool.slpBalance.minus(event.params.amount)
  pool.slpBalanceDecimal = pool.slpBalanceDecimal.minus(amount)
  pool.save();

  const masterChefV2 = getMasterChef(event.block)
  const user = getUser(event.params.user, event.params.pid, event.block)
  user.amount = BIG_INT_ZERO
  user.rewardDebt = BIG_INT_ZERO
  user.save()
}

export function harvest(event: Harvest): void {
  log.info('[MasterChefV2] Log Withdraw {} {} {}', [
    event.params.user.toHex(),
    event.params.pid.toString(),
    event.params.amount.toString()
  ])
  const user = getUser(event.params.user, event.params.pid, event.block)

  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)
  const sushiHarvestedUSD = amount.times(getSushiPrice(event.block))

  // const masterChef = getMasterChef(event.block)
  const pool = getPool(event.params.pid, event.block)
  const poolHistory = getPoolHistory(pool, event.block)
  // const pairContract = PairContract.bind(pool.pair as Address)
  // const userBalance = pairContract.balanceOf(user.address as Address)

  let accumulatedSushi = user.amount.times(pool.accSushiPerShare).div(ACC_SUSHI_PRECISION)
  user.rewardDebt = accumulatedSushi

  user.sushiHarvested = user.sushiHarvested.plus(amount)
  user.sushiHarvestedUSD = user.sushiHarvestedUSD.plus(sushiHarvestedUSD)
  pool.sushiHarvested = pool.sushiHarvested.plus(amount)
  pool.sushiHarvestedUSD = pool.sushiHarvestedUSD.plus(sushiHarvestedUSD)
  poolHistory.sushiHarvested = pool.sushiHarvested;
  poolHistory.sushiHarvestedUSD = pool.sushiHarvestedUSD;

  pool.save()
  poolHistory.save()
  user.save()
}

export function logUpdateReward(event: LogUpdateReward): void {
  log.info('[MasterChefV2] update reward per block {}', [event.params.reward.toString()])
  const masterChef = getMasterChef(event.block)

  masterChef.sushiPerBlock = event.params.reward
  masterChef.save()
}

export function ownershipTransferred(event: OwnershipTransferred): void {
  log.info('Ownership transfered from previous owner: {} to new owner: {}', [
    event.params.previousOwner.toHex(),
    event.params.newOwner.toHex(),
  ])
  getMasterChef(event.block)
}