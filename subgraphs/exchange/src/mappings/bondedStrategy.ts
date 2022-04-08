// export function onDividendClaimed() {

import { Address } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E18, BIG_INT_ONE, BIG_INT_ZERO, NETWORK } from 'const'
import { Bonded, DividendClaimed, UnBonded } from '../../generated/BondedStrategy/BondedStrategy'
import { getBondedStrategyToken } from '../entities/bondedStrategyToken'
import { getBondedStrategy } from '../entities/bondedStrategy'
import { getBondedStrategyUser } from '../entities/bondedStrategyUser'
import { Pair as PairContract } from '../../generated/BondedStrategy/Pair'
import { ERC20 as ERC20Contract } from '../../generated/BondedStrategy/ERC20'
import { getBondedStrategyUserClaim } from '../entities/bondedStrategyUserClaim'
import { getBundle, getPair, getToken } from '../entities'
import { getBondedStrategyHistory } from '../entities/bondedStrategyHistory'
import { getStndPrice } from '../pricing'
import { getBondedStrategyTokenHistory } from '../entities/BondedStrategyTokenHistory'
import { Pair, Token } from '../../generated/schema'

export function onBonded(event: Bonded): void {
  // START: update bondedStrategy
  const bondedStrategy = getBondedStrategy(event.block)
  bondedStrategy.totalSupply = bondedStrategy.totalSupply.plus(event.params.amount)

  // START: update user
  const user = getBondedStrategyUser(event.params.holder.toHex(), event.block)
  // if user's current bonded amount is 0, its user's first bond.
  // increment bondedStrategy.usersCount
  if (user.bonded.equals(BIG_INT_ZERO)) {
    bondedStrategy.usersCount = bondedStrategy.usersCount.plus(BIG_INT_ONE)
  }
  user.bonded = user.bonded.plus(event.params.amount)
  user.lastBonded = event.block.timestamp

  user.save()
  // END: update user

  bondedStrategy.save()
  // END: update BondedStrategy

  const stndPrice = getStndPrice()

  // START: create / update bondedStrategyHistory (day data)
  const bondedStrategyHistory = getBondedStrategyHistory(event.block)
  bondedStrategyHistory.totalSupply = bondedStrategy.totalSupply
  bondedStrategyHistory.totalSupplyUSD = bondedStrategy.totalSupply.divDecimal(BIG_DECIMAL_1E18).times(stndPrice)
  bondedStrategyHistory.usersCount = bondedStrategy.usersCount

  bondedStrategyHistory.save()
  // END: create / update bondedStrategyHistory
}

export function onUnBonded(event: UnBonded): void {
  // START: update BondedStrategy
  const bondedStrategy = getBondedStrategy(event.block)
  bondedStrategy.totalSupply = bondedStrategy.totalSupply.minus(event.params.amount)

  // START: update User
  const user = getBondedStrategyUser(event.params.holder.toHex(), event.block)

  user.bonded = user.bonded.minus(event.params.amount)

  // if users new bonded is 0, user is no longer participating in the bondedStrategy
  // decrement usersCount
  if (user.bonded.equals(BIG_INT_ZERO)) {
    bondedStrategy.usersCount = bondedStrategy.usersCount.minus(BIG_INT_ONE)
  }

  user.save()
  // END: update user

  bondedStrategy.save()
  // END: update bondedStrategy

  const stndPrice = getStndPrice()

  // START: create / update BondedStrategyHistory (day data)
  const bondedStrategyHistory = getBondedStrategyHistory(event.block)
  bondedStrategyHistory.totalSupply = bondedStrategy.totalSupply
  bondedStrategyHistory.totalSupplyUSD = bondedStrategy.totalSupply.divDecimal(BIG_DECIMAL_1E18).times(stndPrice)
  bondedStrategyHistory.usersCount = bondedStrategy.usersCount

  bondedStrategyHistory.save()
  // END: update BondedStrategyHistory
}

export function onDividendClaimed(event: DividendClaimed): void {
  // START: update bondedStrategy
  const bondedStrategy = getBondedStrategy(event.block)

  // get pair instances (hard coded for rinkeby as of now. contract code needs to be updated)
  const tokenAddress = event.params.claimingWith
  const bondedStrategyToken = getBondedStrategyToken(tokenAddress, event.block)

  if (bondedStrategyToken.isPair) {
    const tokenContract = PairContract.bind(tokenAddress)
    // exchange pair is needed to get the lpToken price
    const exchangeToken = getPair(tokenAddress, event.block)

    // get bundle for ethPrice to find lpTokenPrice
    const bundle = getBundle()
    const tokenPrice = exchangeToken.reserveETH.times(bundle.ethPrice).div(exchangeToken.totalSupply)

    // claim amount in USD
    const amountUSD = tokenPrice.times(event.params.amount.divDecimal(BIG_DECIMAL_1E18))

    // START: update User
    const user = getBondedStrategyUser(event.params.claimer.toHex(), event.block)

    // START: update UserClaim
    const userClaim = getBondedStrategyUserClaim(user.id, tokenAddress, bondedStrategyToken.isPair)
    userClaim.lastClaimed = event.block.timestamp
    userClaim.amount = userClaim.amount.plus(event.params.amount)
    userClaim.amountUSD = userClaim.amountUSD.plus(amountUSD)
    userClaim.save()
    // END: update userClaim

    user.totalClaimedUSD = user.totalClaimedUSD.plus(amountUSD)
    user.save()
    // END: update userClaim

    // START: update bondedStrategyPair (aggregates all users)
    bondedStrategyToken.claimedReward = bondedStrategyToken.claimedReward.plus(event.params.amount)
    bondedStrategyToken.claimedRewardUSD = bondedStrategyToken.claimedRewardUSD.plus(amountUSD)

    // query bondedStrategy's new balance of lpToken
    let remainingRewardResult = tokenContract.try_balanceOf(Address.fromString(bondedStrategy.id))

    if (!remainingRewardResult.reverted) {
      // previous to calculate the difference in ETH
      const previousRemainingRewardETH = bondedStrategyToken.remainingRewardETH

      bondedStrategyToken.remainingReward = remainingRewardResult.value
      // find reamining reward in ETH using the exchangePair's reserveETH
      bondedStrategyToken.remainingRewardETH = remainingRewardResult.value
        .divDecimal(BIG_DECIMAL_1E18)
        .div(exchangeToken.totalSupply)
        .times(exchangeToken.reserveETH)

      const reduced = bondedStrategyToken.remainingRewardETH.lt(previousRemainingRewardETH)

      const difference = reduced
        ? previousRemainingRewardETH.minus(bondedStrategyToken.remainingRewardETH)
        : bondedStrategyToken.remainingRewardETH.minus(previousRemainingRewardETH)

      // update reamingRewardETH of bondedStrategy
      if (reduced) {
        bondedStrategy.remainingRewardETH = bondedStrategy.remainingRewardETH.minus(difference)
      } else {
        bondedStrategy.remainingRewardETH = bondedStrategy.remainingRewardETH.plus(difference)
      }
    }

    bondedStrategyToken.save()
    // END: update bondedStrategyPair

    bondedStrategy.totalClaimedUSD = bondedStrategy.totalClaimedUSD.plus(amountUSD)
    bondedStrategy.save()
    // END: update bondedStrategy

    // START: update bondedStrategyHistory
    const bondedStrategyHistory = getBondedStrategyHistory(event.block)
    bondedStrategyHistory.remainingRewardETH = bondedStrategy.remainingRewardETH
    bondedStrategyHistory.remainingRewardUSD = bondedStrategyHistory.remainingRewardETH.times(bundle.ethPrice)
    bondedStrategyHistory.totalClaimedUSD = bondedStrategy.totalClaimedUSD

    bondedStrategyHistory.save()
    // END: update bondedStrategyHistory

    // START: update bondedStrategyHistoryPair
    const bondedStrategyTokenHistory = getBondedStrategyTokenHistory(
      Address.fromString(bondedStrategyToken.id),
      event.block,
      bondedStrategyToken.isPair
    )

    bondedStrategyTokenHistory.claimedReward = bondedStrategyToken.claimedReward
    bondedStrategyTokenHistory.claimedRewardUSD = bondedStrategyToken.claimedRewardUSD
    bondedStrategyTokenHistory.remainingReward = bondedStrategyToken.remainingReward
    bondedStrategyTokenHistory.remainingRewardETH = bondedStrategyToken.remainingRewardETH
    bondedStrategyTokenHistory.remainingRewardUSD = bondedStrategyToken.remainingRewardETH.times(bundle.ethPrice)

    bondedStrategyTokenHistory.save()
  } else {
    const tokenContract = ERC20Contract.bind(tokenAddress)
    // exchange pair is needed to get the lpToken price
    const exchangeToken = getToken(tokenAddress)

    // get bundle for ethPrice to find lpTokenPrice
    const bundle = getBundle()
    const tokenPrice = exchangeToken.derivedETH.times(bundle.ethPrice)

    // claim amount in USD
    const amountUSD = tokenPrice.times(event.params.amount.divDecimal(exchangeToken.decimals.toBigDecimal()))

    // START: update User
    const user = getBondedStrategyUser(event.params.claimer.toHex(), event.block)

    // START: update UserClaim
    const userClaim = getBondedStrategyUserClaim(user.id, tokenAddress, bondedStrategyToken.isPair)
    userClaim.lastClaimed = event.block.timestamp
    userClaim.amount = userClaim.amount.plus(event.params.amount)
    userClaim.amountUSD = userClaim.amountUSD.plus(amountUSD)
    userClaim.save()
    // END: update userClaim

    user.totalClaimedUSD = user.totalClaimedUSD.plus(amountUSD)
    user.save()
    // END: update userClaim

    // START: update bondedStrategyPair (aggregates all users)
    bondedStrategyToken.claimedReward = bondedStrategyToken.claimedReward.plus(event.params.amount)
    bondedStrategyToken.claimedRewardUSD = bondedStrategyToken.claimedRewardUSD.plus(amountUSD)

    // query bondedStrategy's new balance of lpToken
    let remainingRewardResult = tokenContract.try_balanceOf(Address.fromString(bondedStrategy.id))

    if (!remainingRewardResult.reverted) {
      // previous to calculate the difference in ETH
      const previousRemainingRewardETH = bondedStrategyToken.remainingRewardETH

      bondedStrategyToken.remainingReward = remainingRewardResult.value
      // find reamining reward in ETH using the exchangePair's reserveETH
      bondedStrategyToken.remainingRewardETH = remainingRewardResult.value
        .divDecimal(exchangeToken.decimals.toBigDecimal())
        .times(exchangeToken.derivedETH)

      const reduced = bondedStrategyToken.remainingRewardETH.lt(previousRemainingRewardETH)

      const difference = reduced
        ? previousRemainingRewardETH.minus(bondedStrategyToken.remainingRewardETH)
        : bondedStrategyToken.remainingRewardETH.minus(previousRemainingRewardETH)

      // update reamingRewardETH of bondedStrategy
      if (reduced) {
        bondedStrategy.remainingRewardETH = bondedStrategy.remainingRewardETH.minus(difference)
      } else {
        bondedStrategy.remainingRewardETH = bondedStrategy.remainingRewardETH.plus(difference)
      }
    }

    bondedStrategyToken.save()
    // END: update bondedStrategyPair

    bondedStrategy.totalClaimedUSD = bondedStrategy.totalClaimedUSD.plus(amountUSD)
    bondedStrategy.save()
    // END: update bondedStrategy

    // START: update bondedStrategyHistory
    const bondedStrategyHistory = getBondedStrategyHistory(event.block)
    bondedStrategyHistory.remainingRewardETH = bondedStrategy.remainingRewardETH
    bondedStrategyHistory.remainingRewardUSD = bondedStrategyHistory.remainingRewardETH.times(bundle.ethPrice)
    bondedStrategyHistory.totalClaimedUSD = bondedStrategy.totalClaimedUSD

    bondedStrategyHistory.save()
    // END: update bondedStrategyHistory

    // START: update bondedStrategyHistoryPair
    const bondedStrategyTokenHistory = getBondedStrategyTokenHistory(
      Address.fromString(bondedStrategyToken.id),
      event.block,
      bondedStrategyToken.isPair
    )

    bondedStrategyTokenHistory.claimedReward = bondedStrategyToken.claimedReward
    bondedStrategyTokenHistory.claimedRewardUSD = bondedStrategyToken.claimedRewardUSD
    bondedStrategyTokenHistory.remainingReward = bondedStrategyToken.remainingReward
    bondedStrategyTokenHistory.remainingRewardETH = bondedStrategyToken.remainingRewardETH
    bondedStrategyTokenHistory.remainingRewardUSD = bondedStrategyToken.remainingRewardETH.times(bundle.ethPrice)

    bondedStrategyTokenHistory.save()
  }

  // END: update bondedStrategyHistoryPair
}
