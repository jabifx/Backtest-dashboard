"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProgressIndicatorProps {
  value: number
  max?: number
  label?: string
  status?: "idle" | "running" | "completed" | "error"
  showPercentage?: boolean
  className?: string
}

export function ProgressIndicator({
  value,
  max = 100,
  label,
  status = "idle",
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "running":
        return "In Progress"
      case "completed":
        return "Completed"
      case "error":
        return "Error"
      default:
        return "Ready"
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
        <div className="flex items-center gap-2">
          {showPercentage && <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>}
          <Badge
            variant="outline"
            className={cn("text-xs", {
              "animate-pulse": status === "running",
            })}
          >
            <div className={cn("w-2 h-2 rounded-full mr-1", getStatusColor())} />
            {getStatusText()}
          </Badge>
        </div>
      </div>
      <Progress
        value={percentage}
        className={cn("h-2", {
          "animate-pulse": status === "running",
        })}
      />
    </div>
  )
}
