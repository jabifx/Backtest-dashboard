export interface Signal {
  time: string | number
  price: number
  type: "entry" | "exit"
  side: "buy" | "sell"
  id?: string
  volume?: number
}
