import { BigInt } from "@graphprotocol/graph-ts";
import { BIG_INT_ONE_DAY_SECONDS } from "const";

export function getDateFromTimestamp(timestamp: BigInt): i32 {
    return timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  }
  
  