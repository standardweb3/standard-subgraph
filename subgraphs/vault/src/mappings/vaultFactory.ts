import { ethereum, log } from "@graphprotocol/graph-ts";

export function onBlockChange(block:ethereum.Block):void {
    log.info('vault factory block change', [])
}  