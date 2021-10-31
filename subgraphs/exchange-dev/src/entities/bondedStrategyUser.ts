import { ethereum } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "const";
import { BondedStrategyUser } from "../../generated/schema";
import { getBondedStrategy } from "./bondedStrategy";

export function getBondedStrategyUser(userId: string, block: ethereum.Block): BondedStrategyUser {
    const bondedStrategy = getBondedStrategy(block)
    let user = BondedStrategyUser.load(userId)

    if (user === null) {
        user = new BondedStrategyUser(userId)
        user.bondedStrategy = bondedStrategy.id

        user.lastBonded = BIG_INT_ZERO;
        user.bonded = BIG_INT_ZERO;

        user.totalClaimedUSD = BIG_DECIMAL_ZERO;
    }
    user.save()

    return user as BondedStrategyUser;
}