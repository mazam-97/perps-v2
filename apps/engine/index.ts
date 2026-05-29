
import {
    BALANCES,
    MARKET_PRICES,
    MinHeap,
    ORDERS,
    ORDERBOOKS,
    POSITIONS,
    type Ask,
    type Balance,
    type Bid,
    type Fill,
    type MarketType,
    type Order,
    type Orderbook,
    type Position,
    type RestingOrder,
    type Side
} from "./store/types";

export type PayloadType = {
    command: string,
    userId: string,
    price: number,
    slippage: number,
    qty: number,
    symbol: string,
    margin: number,
    side: Side,
    type: MarketType
};

// ============================================================
// HELPERS
// ============================================================

const calculateRealizedPnl = (
    side: Side,
    entryPrice: number,
    exitPrice: number,
    qty: number
) => {

    return side === "long"
        ? (exitPrice - entryPrice) * qty
        : (entryPrice - exitPrice) * qty;
};

const calculateUnrealizedPnl = (
    side: Side,
    entryPrice: number,
    marketPrice: number,
    qty: number
) => {

    return side === "long"
        ? (marketPrice - entryPrice) * qty
        : (entryPrice - marketPrice) * qty;
};

const getOrCreateBalance = (
    userId: string
): Balance => {

    const existingBalance = BALANCES.get(userId);

    if (existingBalance) {
        return existingBalance;
    }

    const emptyBalance: Balance = {
        available: 0,
        locked: 0
    };

    BALANCES.set(userId, emptyBalance);

    return emptyBalance;
};

const getOrCreateOrderbook = (
    symbol: string
): Orderbook => {

    const existingOrderbook =
        ORDERBOOKS.get(symbol);

    if (existingOrderbook) {
        return existingOrderbook;
    }

    const newOrderbook: Orderbook = {
        asks: new Map<number, Ask[]>(),
        bids: new Map<number, Bid[]>(),
        askheap: new MinHeap(),
        bidheap: new MinHeap(),
        lastTradedPrice: 0,
        marketPrice: 0
    };

    ORDERBOOKS.set(symbol, newOrderbook);

    return newOrderbook;
};

// ============================================================
// POSITION ENGINE
// ============================================================

const UpdatePosition = (
    order: Order,
    fill: Fill,
    type: "maker" | "taker"
) => {

    const userId =
        type === "taker"
            ? order.userId
            : ORDERS.get(fill.makerOrderId)?.userId!;

    const symbol = order.symbol;

    const userPositions =
        POSITIONS.get(userId) ?? {};

    const existingPosition =
        userPositions[symbol];

    const marketPrice =
        MARKET_PRICES.get(symbol)!;

    const fillQty = fill.filledQty;

    const fillPrice = fill.price;

    const fillMargin = fill.margin;

    let userBalance =
        BALANCES.get(userId)!;

    // ========================================================
    // NO EXISTING POSITION
    // ========================================================

    if (!existingPosition) {

        const newPosition: Position = {
            symbol,
            side: order.side,
            quantity: fillQty,
            entryPrice: fillPrice,
            margin: fillMargin,
            fundingRate: 0,
            liquidationPrice: 0,
            type,
            pnl: calculateUnrealizedPnl(
                order.side,
                fillPrice,
                marketPrice,
                fillQty
            )
        };

        POSITIONS.set(userId, {
            ...userPositions,
            [symbol]: newPosition
        });

        return;
    }

    // ========================================================
    // SAME SIDE
    // ========================================================

    if (existingPosition.side === order.side) {

        const newQty =
            existingPosition.quantity +
            fillQty;

        const avgEntry =
            (
                existingPosition.entryPrice *
                existingPosition.quantity
                +
                fillPrice * fillQty
            ) / newQty;

        existingPosition.entryPrice =
            avgEntry;

        existingPosition.quantity =
            newQty;

        existingPosition.margin +=
            fillMargin;

        existingPosition.pnl =
            calculateUnrealizedPnl(
                existingPosition.side,
                avgEntry,
                marketPrice,
                newQty
            );

        POSITIONS.set(userId, {
            ...userPositions,
            [symbol]: existingPosition
        });

        return;
    }

    // ========================================================
    // OPPOSITE SIDE
    // ========================================================

    const existingQty =
        existingPosition.quantity;

    // ========================================================
    // PARTIAL CLOSE
    // ========================================================

    if (existingQty > fillQty) {

        const realizedPnl =
            calculateRealizedPnl(
                existingPosition.side,
                existingPosition.entryPrice,
                fillPrice,
                fillQty
            );

        const releasedMargin =
            existingPosition.margin *
            (fillQty / existingQty);

        existingPosition.quantity -=
            fillQty;

        existingPosition.margin -=
            releasedMargin;

        existingPosition.pnl =
            calculateUnrealizedPnl(
                existingPosition.side,
                existingPosition.entryPrice,
                marketPrice,
                existingPosition.quantity
            );

        userBalance = {
            available:
                userBalance.available +
                releasedMargin +
                realizedPnl,

            locked:
                userBalance.locked -
                releasedMargin
        };

        BALANCES.set(userId, userBalance);

        POSITIONS.set(userId, {
            ...userPositions,
            [symbol]: existingPosition
        });

        return;
    }

    // ========================================================
    // FULL CLOSE
    // ========================================================

    if (existingQty === fillQty) {

        const realizedPnl =
            calculateRealizedPnl(
                existingPosition.side,
                existingPosition.entryPrice,
                fillPrice,
                fillQty
            );

        userBalance = {
            available:
                userBalance.available +
                existingPosition.margin +
                realizedPnl,

            locked:
                userBalance.locked -
                existingPosition.margin
        };

        BALANCES.set(userId, userBalance);

        delete userPositions[symbol];

        POSITIONS.set(userId, userPositions);

        return;
    }

    // ========================================================
    // FLIP POSITION
    // ========================================================

    const closedQty =
        existingQty;

    const leftoverQty =
        fillQty - existingQty;

    const realizedPnl =
        calculateRealizedPnl(
            existingPosition.side,
            existingPosition.entryPrice,
            fillPrice,
            closedQty
        );

    userBalance = {
        available:
            userBalance.available +
            existingPosition.margin +
            realizedPnl,

        locked:
            userBalance.locked -
            existingPosition.margin
    };

    BALANCES.set(userId, userBalance);

    const leftoverMargin =
        fillMargin *
        (leftoverQty / fillQty);

    const newPosition: Position = {
        symbol,
        side: order.side,
        quantity: leftoverQty,
        entryPrice: fillPrice,
        margin: leftoverMargin,
        fundingRate: 0,
        liquidationPrice: 0,
        type,
        pnl: calculateUnrealizedPnl(
            order.side,
            fillPrice,
            marketPrice,
            leftoverQty
        )
    };

    POSITIONS.set(userId, {
        ...userPositions,
        [symbol]: newPosition
    });
};

// ============================================================
// ORDERBOOK HELPERS
// ============================================================

const cleanupAskLevel = (
    orderbook: Orderbook,
    price: number
) => {

    const level =
        orderbook.asks.get(price);

    if (!level) return;

    const remainingOrders =
        level.filter(
            (o) => o.availableQty > 0
        );

    if (remainingOrders.length === 0) {

        orderbook.asks.delete(price);

        orderbook.askheap.pop();

        return;
    }

    orderbook.asks.set(
        price,
        remainingOrders
    );
};

const cleanupBidLevel = (
    orderbook: Orderbook,
    price: number
) => {

    const level =
        orderbook.bids.get(price);

    if (!level) return;

    const remainingOrders =
        level.filter(
            (o) => o.availableQty > 0
        );

    if (remainingOrders.length === 0) {

        orderbook.bids.delete(price);

        orderbook.bidheap.pop();

        return;
    }

    orderbook.bids.set(
        price,
        remainingOrders
    );
};

// ============================================================
// ENGINE
// ============================================================

export const ProcessEngineRequest = (
    payload: PayloadType
) => {

    switch (payload.command) {

        case "create_order": {

            const {
                qty,
                side,
                type,
                margin,
                symbol,
                userId,
                slippage
            } = payload;

            const orderbook =
                getOrCreateOrderbook(symbol);

            let userBalance =
                getOrCreateBalance(userId);

            if (
                userBalance.available <
                margin
            ) {
                throw new Error(
                    "Insufficient balance"
                );
            }

            // =================================================
            // LOCK BALANCE
            // =================================================

            userBalance = {
                available:
                    userBalance.available -
                    margin,

                locked:
                    userBalance.locked +
                    margin
            };

            BALANCES.set(
                userId,
                userBalance
            );

            // =================================================
            // PRICE
            // =================================================

            let executionPrice =
                payload.price;

            if (type === "market") {

                executionPrice =
                    side === "long"
                        ? payload.price *
                        (1 + slippage / 100)
                        : payload.price *
                        (1 - slippage / 100);
            }

            // =================================================
            // CREATE ORDER
            // =================================================

            const order: Order = {
                orderId:
                    crypto.randomUUID(),

                userId,

                qty,

                filledQty: 0,

                price: executionPrice,

                margin,

                fills: [],

                side,

                type,

                symbol,

                status: "Open",

                createdAt:
                    Date.now().toString()
            };

            ORDERS.set(
                order.orderId,
                order
            );

            let remainingQty = qty;

            // =================================================
            // LONG ORDER
            // =================================================

            if (side === "long") {

                while (remainingQty > 0) {

                    const bestAskPrice =
                        orderbook.askheap.peek();

                    if (
                        bestAskPrice ===
                        undefined
                    ) {
                        break;
                    }

                    // limit order check
                    if (
                        type === "limit" &&
                        bestAskPrice >
                        executionPrice
                    ) {
                        break;
                    }

                    const asks =
                        orderbook.asks.get(
                            bestAskPrice
                        );

                    if (!asks) {
                        break;
                    }

                    for (const ask of asks) {

                        if (
                            remainingQty <= 0
                        ) {
                            break;
                        }

                        if (
                            ask.availableQty <=
                            0
                        ) {
                            continue;
                        }

                        const fillQty =
                            Math.min(
                                remainingQty,
                                ask.availableQty
                            );

                        const fill: Fill = {
                            fillId:
                                crypto.randomUUID(),

                            makerOrderId:
                                ask.openOrders
                                    .orderId,

                            takerOrderId:
                                order.orderId,

                            filledQty:
                                fillQty,

                            qty:
                                ask.openOrders
                                    .qty,

                            price:
                                ask.openOrders
                                    .price,

                            margin:
                                margin *
                                (fillQty /
                                    qty),

                            symbol
                        };

                        order.fills.push(
                            fill
                        );

                        remainingQty -=
                            fillQty;

                        order.filledQty +=
                            fillQty;

                        ask.availableQty -=
                            fillQty;

                        ask.openOrders
                            .filledQty +=
                            fillQty;

                        UpdatePosition(
                            order,
                            fill,
                            "taker"
                        );

                        UpdatePosition(
                            order,
                            fill,
                            "maker"
                        );

                        orderbook.lastTradedPrice =
                            fill.price;

                        MARKET_PRICES.set(
                            symbol,
                            fill.price
                        );
                    }

                    cleanupAskLevel(
                        orderbook,
                        bestAskPrice
                    );
                }

                // =============================================
                // RESTING LIMIT ORDER
                // =============================================

                if (
                    remainingQty > 0 &&
                    type === "limit"
                ) {

                    const restingOrder: RestingOrder =
                    {
                        orderId:
                            order.orderId,

                        userId,

                        margin:
                            margin *
                            (remainingQty /
                                qty),

                        qty:
                            remainingQty,

                        filledQty: 0,

                        price:
                            executionPrice,

                        side,

                        symbol,

                        type: "limit"
                    };

                    const existingLevel =
                        orderbook.bids.get(
                            executionPrice
                        );

                    if (
                        existingLevel
                    ) {

                        existingLevel.push(
                            {
                                availableQty:
                                    remainingQty,

                                openOrders:
                                    restingOrder
                            }
                        );
                    } else {

                        orderbook.bids.set(
                            executionPrice,
                            [
                                {
                                    availableQty:
                                        remainingQty,

                                    openOrders:
                                        restingOrder
                                }
                            ]
                        );

                        orderbook.bidheap.push(
                            - executionPrice
                        );
                    }
                }
            }

            // =================================================
            // SHORT ORDER
            // =================================================

            else {

                while (remainingQty > 0) {

                    const bestBidPrice =
                        - Number(orderbook.bidheap.peek());

                    if (
                        bestBidPrice ===
                        undefined
                    ) {
                        break;
                    }

                    if (
                        type === "limit" &&
                        bestBidPrice <
                        executionPrice
                    ) {
                        break;
                    }

                    const bids =
                        orderbook.bids.get(
                            bestBidPrice
                        );

                    if (!bids) {
                        break;
                    }

                    for (const bid of bids) {

                        if (
                            remainingQty <= 0
                        ) {
                            break;
                        }

                        if (
                            bid.availableQty <=
                            0
                        ) {
                            continue;
                        }

                        const fillQty =
                            Math.min(
                                remainingQty,
                                bid.availableQty
                            );

                        const fill: Fill = {
                            fillId:
                                crypto.randomUUID(),

                            makerOrderId:
                                bid.openOrders
                                    .orderId,

                            takerOrderId:
                                order.orderId,

                            filledQty:
                                fillQty,

                            qty:
                                bid.openOrders
                                    .qty,

                            price:
                                bid.openOrders
                                    .price,

                            margin:
                                margin *
                                (fillQty /
                                    qty),

                            symbol
                        };

                        order.fills.push(
                            fill
                        );

                        remainingQty -=
                            fillQty;

                        order.filledQty +=
                            fillQty;

                        bid.availableQty -=
                            fillQty;

                        bid.openOrders
                            .filledQty +=
                            fillQty;

                        UpdatePosition(
                            order,
                            fill,
                            "taker"
                        );

                        UpdatePosition(
                            order,
                            fill,
                            "maker"
                        );

                        orderbook.lastTradedPrice =
                            fill.price;

                        MARKET_PRICES.set(
                            symbol,
                            fill.price
                        );
                    }

                    cleanupBidLevel(
                        orderbook,
                        bestBidPrice
                    );
                }

                // =============================================
                // RESTING LIMIT ORDER
                // =============================================

                if (
                    remainingQty > 0 &&
                    type === "limit"
                ) {

                    const restingOrder: RestingOrder =
                    {
                        orderId:
                            order.orderId,

                        userId,

                        margin:
                            margin *
                            (remainingQty /
                                qty),

                        qty:
                            remainingQty,

                        filledQty: 0,

                        price:
                            executionPrice,

                        side,

                        symbol,

                        type: "limit"
                    };

                    const existingLevel =
                        orderbook.asks.get(
                            executionPrice
                        );

                    if (
                        existingLevel
                    ) {

                        existingLevel.push(
                            {
                                availableQty:
                                    remainingQty,

                                openOrders:
                                    restingOrder
                            }
                        );
                    } else {

                        orderbook.asks.set(
                            executionPrice,
                            [
                                {
                                    availableQty:
                                        remainingQty,

                                    openOrders:
                                        restingOrder
                                }
                            ]
                        );

                        orderbook.askheap.push(
                            executionPrice
                        );
                    }
                }
            }

            // =================================================
            // REFUND UNUSED MARGIN
            // =================================================

            if (
                type === "market" &&
                remainingQty > 0
            ) {

                const unusedMargin =
                    margin *
                    (remainingQty / qty);

                userBalance =
                    BALANCES.get(userId)!;

                userBalance = {
                    available:
                        userBalance.available +
                        unusedMargin,

                    locked:
                        userBalance.locked -
                        unusedMargin
                };

                BALANCES.set(
                    userId,
                    userBalance
                );
            }

            // =================================================
            // ORDER STATUS
            // =================================================

            if (
                order.filledQty === 0
            ) {
                order.status =
                    "Open";
            }

            else if (
                order.filledQty <
                order.qty
            ) {
                order.status =
                    "Partially_filled";
            }

            else {
                order.status =
                    "Filled";
            }

            ORDERS.set(
                order.orderId,
                order
            );

            return order;
        }

        default:
            throw new Error(
                "Invalid command"
            );
    }
};
