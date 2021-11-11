import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  FACTORY_ADDRESS,
  SUSHI_TOKEN_ADDRESS,
  USDC_WETH_PAIR_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
  SUSHI_WETH_PAIR_FIRST_LIQUIDITY_BLOCK,
  BIG_INT_ZERO,
  SUSHI_USDC_PAIR_ADDRESS, SUSHI_USDC_PAIR_FIRST_LIQUIDITY_BLOCK ,
} from "const";
import {
  Address,
  BigDecimal,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";

import { Factory as FactoryContract } from "exchange/generated/Factory/Factory";
import { Pair as PairContract } from "exchange/generated/Factory/Pair";

export function getUSDRate(token: Address, block: ethereum.Block): BigDecimal {
  const usdc = BIG_DECIMAL_ONE;

  if (token != USDC_ADDRESS) {
    if (block.number.lt(SUSHI_USDC_PAIR_FIRST_LIQUIDITY_BLOCK)) return BIG_DECIMAL_ZERO
    const address = USDC_WETH_PAIR_ADDRESS;

    const tokenPriceETH = getEthRate(token, block);

    const pair = PairContract.bind(address);

    const reserves = pair.getReserves();

    const reserve0 = reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18);

    const reserve1 = reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18);

    const ethPriceUSD = reserve1
      .div(reserve0)
      .div(BIG_DECIMAL_1E6)
      .times(BIG_DECIMAL_1E18);

    return ethPriceUSD.times(tokenPriceETH);
  }

  return usdc;
}

export function getEthRate(token: Address, block: ethereum.Block): BigDecimal {
  let eth = BIG_DECIMAL_ONE;

  if (token != WETH_ADDRESS) {
    const factory = FactoryContract.bind(FACTORY_ADDRESS);

    const address = factory.getPair(token, WETH_ADDRESS);

    if (address == ADDRESS_ZERO) {
      log.info("Adress ZERO...", []);
      return BIG_DECIMAL_ZERO;
    }

    const pair = PairContract.bind(address);

    const reserves = pair.getReserves();

    eth =
      pair.token0() == WETH_ADDRESS
        ? reserves.value0
            .toBigDecimal()
            .times(BIG_DECIMAL_1E18)
            .div(reserves.value1.toBigDecimal())
        : reserves.value1
            .toBigDecimal()
            .times(BIG_DECIMAL_1E18)
            .div(reserves.value0.toBigDecimal());

    return eth.div(BIG_DECIMAL_1E18);
  }

  return eth;
}

export function getSushiPrice(block: ethereum.Block): BigDecimal {
  if (SUSHI_WETH_PAIR_FIRST_LIQUIDITY_BLOCK.notEqual(BIG_INT_ZERO) 
    && block.number.lt(SUSHI_WETH_PAIR_FIRST_LIQUIDITY_BLOCK)) {
    // If before uniswap sushi-eth pair creation and liquidity added, return zero
    return BIG_DECIMAL_ZERO;
  } else if (SUSHI_USDC_PAIR_FIRST_LIQUIDITY_BLOCK.notEqual(BIG_INT_ZERO)  
    && block.number.lt(SUSHI_USDC_PAIR_FIRST_LIQUIDITY_BLOCK)) {
    // Else if before uniswap sushi-usdt pair creation (get price from eth sushi-eth pair above)
    return getUSDRate(SUSHI_TOKEN_ADDRESS, block);
  } else {
    // Else get price from either uni or sushi usdt pair depending on space-time
    const pair = PairContract.bind(
      SUSHI_USDC_PAIR_ADDRESS
    );
    const reserves = pair.getReserves();
    return reserves.value1
      .toBigDecimal()
      .times(BIG_DECIMAL_1E18)
      .div(reserves.value0.toBigDecimal())
      .div(BIG_DECIMAL_1E6);
  }
}
