import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Target, DollarSign, Receipt } from "lucide-react"
import { useState, useEffect } from "react"

interface BacktestStats {
  net_profit: number
  total_comission: number
  total_trades: number
  win_rate: number
  current_balance: number
  initial_balance: number
  wins: number
  losses: number
}

interface StatsPanelProps {
  stats: BacktestStats
  isUpdated?: boolean
}

// Componente para animar un dígito individual
function AnimatedDigit({ digit, className = "" }: { 
  digit: string,
  className?: string 
}) {
  const [displayDigit, setDisplayDigit] = useState(digit)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  useEffect(() => {
    if (digit !== displayDigit) {
      // Determinar dirección solo para números
      if (!isNaN(parseInt(digit)) && !isNaN(parseInt(displayDigit))) {
        setDirection(parseInt(digit) > parseInt(displayDigit) ? 'up' : 'down')
      } else {
        setDirection('up') // Default para símbolos
      }
      
      setIsAnimating(true)
      
      // Después de la animación, actualizar el dígito
      const timer = setTimeout(() => {
        setDisplayDigit(digit)
        setIsAnimating(false)
      }, 150) // Mitad de la duración de la animación
      
      return () => clearTimeout(timer)
    }
  }, [digit, displayDigit])

  return (
    <span className={`relative inline-block overflow-hidden ${className}`}>
      {/* Dígito actual */}
      <span className={`inline-block transition-transform duration-300 ease-out ${
        isAnimating 
          ? (direction === 'up' ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0')
          : 'translate-y-0 opacity-100'
      }`}>
        {displayDigit}
      </span>
      
      {/* Dígito nuevo que entra */}
      {isAnimating && (
        <span className={`absolute inset-0 inline-block transition-transform duration-300 ease-out ${
          direction === 'up' 
            ? 'animate-slide-up' 
            : 'animate-slide-down'
        }`}>
          {digit}
        </span>
      )}
    </span>
  )
}

// Componente para animar números descomponiendo en dígitos
function AnimatedNumber({ value, formatter, className = "" }: { 
  value: number, 
  formatter: (val: number) => string,
  className?: string 
}) {
  const formattedValue = formatter(value)
  
  return (
    <span className={`inline-block ${className}`}>
      {formattedValue.split('').map((char, index) => (
        <AnimatedDigit 
          key={index} 
          digit={char}
        />
      ))}
    </span>
  )
}

export function StatsPanel({ stats, isUpdated = false }: StatsPanelProps) {
  const formatPercent = (value: number) => `${value.toFixed(2)}%`
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`
  const formatNumber = (value: number) => value.toFixed(2)
  const formatInteger = (value: number) => value.toString()

  return (
    <>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold h-8 flex items-center ${
            stats.net_profit >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {stats.net_profit >= 0 ? "+" : ""}
            <AnimatedNumber 
              value={stats.net_profit} 
              formatter={formatPercent}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 h-8 flex items-center">
            $<AnimatedNumber 
              value={stats.total_comission} 
              formatter={formatNumber}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold h-8 flex items-center">
            <AnimatedNumber 
              value={stats.win_rate} 
              formatter={formatPercent}
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AnimatedNumber 
              value={stats.wins} 
              formatter={formatInteger}
              className="inline-block"
            />
            <span>W /</span>
            <AnimatedNumber 
              value={stats.losses} 
              formatter={formatInteger}
              className="inline-block"
            />
            <span>L</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold h-8 flex items-center">
            <AnimatedNumber 
              value={stats.total_trades} 
              formatter={formatInteger}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold h-8 flex items-center">
            <AnimatedNumber 
              value={stats.current_balance} 
              formatter={formatCurrency}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
