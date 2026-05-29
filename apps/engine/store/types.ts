


export type Balance ={
  available: number,
  locked: number
}

export type Ask ={
  availableQty: number,
  openOrders: RestingOrder
}

export type Bid = {
  availableQty: number,
  openOrders: RestingOrder
}

export type Orderbook ={
  asks: Map<number,Ask[]>,
  bids: Map<number,Bid[]>,
  lastTradedPrice: number,
  marketPrice: number,
  askheap: MinHeap
  bidheap: MinHeap
}
export type MarketType = "limit" | "market"
export type Side = "long" | "short";
export type Status = "Open" | "Partially_filled" | "Filled" | "Cancelled"
export type RestingOrder ={
orderId: string,
  price: number,
  qty: number,
  symbol: string,
  margin: number,
  userId: string,
  filledQty: number
  side: Side,
  type: "limit"
}
export type Fill ={
  fillId: string,
  price: number,
  qty: number,
  symbol: string,
  margin: number,
  makerOrderId: string,
  takerOrderId: string,
  filledQty: number
}
export type Order ={
  orderId: string,
  price: number,
  qty: number,
  symbol: string,
  margin: number,
  userId: string,
  filledQty: number
  side: Side,
  fills: Fill[]
  createdAt: string,
  type: MarketType,
  status: Status
}

export class MinHeap{
  heap:Number[];

  constructor(){
      this.heap = []
  }

  getParent(index: number){

      return Math.floor(index - 1)/2;
  }

  getLeftChildren(index: number){
      return 2 * index + 1;
  }

  getRightChildren(index: number){
      return 2 * index + 2;
  }

  swap(index1: number, index2: number){
       if(this.heap[index1] && this.heap[index2])
       return [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]]
  }
  push(data: number){
      this.heap.push();
      this.heapifyUp(this.heap.length - 1);
  }
  pop(){
      this.heap.pop();
      this.swap(this.heap.length -1 , 0);
      this.heapifyDown(0);

  }

  heapifyUp(index: number){
          if(index <=0) return;

          let data = this.heap[index];
          let parentIndex = this.getParent(index);
          let parentData = this.heap[parentIndex];
          if(parentData! > data!){
              this.swap(parentIndex, index);
              this.heapifyUp(parentIndex);
          }
      

  }

 heapifyDown(index: number) {
  const length = this.heap.length;
  let smallestIndex = index;

  const leftChildIndex = this.getLeftChildren(index);
  const rightChildIndex = this.getRightChildren(index);

  // 1. If left child is within bounds and smaller than current node
  if (leftChildIndex < length && this.heap[leftChildIndex]! < this.heap[smallestIndex]!) {
      smallestIndex = leftChildIndex;
  }

  // 2. If right child is within bounds and smaller than the smallest found so far
  if (rightChildIndex < length && this.heap[rightChildIndex]! < this.heap[smallestIndex]!) {
      smallestIndex = rightChildIndex;
  }

  // 3. If a child was smaller, swap and continue down the tree
  if (smallestIndex !== index) {
      this.swap(index, smallestIndex);
      this.heapifyDown(smallestIndex);
  }
}


  peek(): number{
      return 0;
  }
}

export type Position = {
  userId?: string,
  entryPrice: number,
  margin: number,
  pnl: number,
  quantity: number,
  side: Side,
  type: "maker"| "taker"
  symbol?: string,
  liquidationPrice: number,
  fundingRate: number
}

export const MARKET_PRICES = new Map<string, number>();
export const POSITIONS = new Map<string, Record<string, Position>>();
export const BALANCES = new Map<string, Balance>();
export const ORDERBOOKS = new Map<string, Orderbook>();
export const ORDERS = new Map<string, Order>();