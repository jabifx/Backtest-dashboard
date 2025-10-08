import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EquityPoint, BacktestStats } from "@/types/backtest";
import { formatBalance, formatTooltip } from "@/lib/backtest-utils";

interface BalanceChartProps {
    equityData: EquityPoint[];
    stats: BacktestStats;
}

export function BalanceChart({ equityData, stats }: BalanceChartProps) {
    return (
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">Balance Evolution</CardTitle>
                <CardDescription>Track your balance changes throughout the backtest</CardDescription>
            </CardHeader>
            <CardContent>
                {equityData.length > 0 ? (
                    <div className="h-[300px] w-full rounded-lg overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={equityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" />
                                <XAxis
                                    dataKey="trade"
                                    className="text-muted-foreground text-xs"
                                    axisLine={false}
                                    tickLine={false}
                                    type="number"
                                    scale="linear"
                                    domain={["dataMin", "dataMax"]}
                                />
                                <YAxis
                                    className="text-muted-foreground text-xs"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={formatBalance}
                                    domain={[Math.min(stats.initial_balance, ...equityData.map((d) => d.balance)), "auto"]}
                                />
                                <Tooltip
                                    formatter={formatTooltip}
                                    labelFormatter={(label) => `Trade: ${label}`}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }}
                                    isAnimationActive={equityData.length <= 3}
                                    animationDuration={300}
                                    animationEasing="ease-out"
                                    animationBegin={0}
                                />
                                <ReferenceLine
                                    y={stats.initial_balance}
                                    stroke="hsl(var(--muted-foreground))"
                                    strokeDasharray="5 5"
                                    strokeWidth={1.5}
                                    label={{
                                        value: "Initial Balance",
                                        position: "insideTopRight",
                                        fill: "hsl(var(--muted-foreground))",
                                        fontSize: 12,
                                        fontWeight: 500,
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="text-center">
                            <p className="text-lg mb-2">No balance data available</p>
                            <p className="text-sm">The chart will be displayed when backtest data is available</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}