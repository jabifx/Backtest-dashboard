"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, TrendingUp, Clock, DollarSign, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TradeData {
    id: string
    result: "TP" | "SL" | "MANUAL"
    timestamp: string
    tipo: "LONG" | "SHORT"
    pnl: number
    order_type: "market" | "limit" | "stop"
    fees: number
    pair: string
}

interface TradesPanelProps {
    trades: TradeData[]
    isVisible: boolean
    onToggle: () => void
    className?: string
}

export function TradesPanel({ trades, isVisible, onToggle, className }: TradesPanelProps) {
    const [isMinimized, setIsMinimized] = useState(false)

    if (!isVisible) return null

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
    }

    const getResultColor = (result: string) => {
        switch (result) {
            case "TP":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            case "SL":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            default:
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        }
    }

    const getTipoColor = (tipo: string) => {
        return tipo === "LONG"
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    }

    const getPnLColor = (pnl: number) => {
        return pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    }

    return (
        <Card
            className={cn(
                "fixed right-4 top-20 w-96 max-h-[calc(100vh-6rem)] shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 transition-all duration-300",
                isMinimized && "h-14",
                className,
            )}
        >
            <CardHeader className="pb-2 px-4 py-3 border-b">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>Live Trades</span>
                        <Badge variant="secondary" className="text-xs">
                            {trades.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <TrendingUp className={cn("h-4 w-4 transition-transform", isMinimized && "rotate-180")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>

            {!isMinimized && (
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-12rem)]">
                        {trades.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <Zap className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No trades yet</p>
                                <p className="text-xs">Trades will appear here in real-time</p>
                            </div>
                        ) : (
                            <div className="space-y-2 p-4">
                                {trades
                                    .slice()
                                    .reverse()
                                    .map((trade, index) => (
                                        <div
                                            key={trade.id}
                                            className={cn(
                                                "p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
                                                index === 0 && "bg-blue-50 dark:bg-blue-900/50",
                                                "bg-slate-50/50 dark:bg-slate-800/50",
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn("text-xs font-medium", getResultColor(trade.result))}>
                                                        {trade.result}
                                                    </Badge>
                                                    <Badge className={cn("text-xs font-medium", getTipoColor(trade.tipo))}>{trade.tipo}</Badge>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTime(trade.timestamp)}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Pair:</span>
                                                    <span className="font-medium">{trade.pair}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Type:</span>
                                                    <span className="font-medium capitalize">{trade.order_type}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">PnL:</span>
                                                    <span className={cn("font-bold text-sm", getPnLColor(trade.pnl))}>
                                                        {formatCurrency(trade.pnl)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Fees:</span>
                                                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                        -{formatCurrency(trade.fees)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    )
}
