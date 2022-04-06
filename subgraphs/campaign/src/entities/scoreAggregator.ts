import { Address } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from 'const'
import { ScoreAggregator, User } from '../../generated/schema'

export function getScoreAggregator(): ScoreAggregator {
  let scoreAggregator = ScoreAggregator.load("scoreAggregator")
  if (scoreAggregator === null) {
    scoreAggregator = new ScoreAggregator("scoreAggregator")
    scoreAggregator.usersCount = BIG_INT_ZERO
    scoreAggregator.totalScore = BIG_DECIMAL_ZERO
    scoreAggregator.save()
  }
  return scoreAggregator as ScoreAggregator
}
