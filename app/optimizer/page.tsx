import { StrategyOptimizer } from "@/components/strategy-optimizer"

export default function OptimizerPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined' && window.electronAPI) {
            window.electronAPI.setCurrentPage('optimizer');
          }
        `
      }} />
      <StrategyOptimizer />
    </>
  )
}

export const metadata = {
    title: "Strategy Optimizer - TradingBot Platform",
    description: "Optimize your trading strategies with parameter sweeps",
}
