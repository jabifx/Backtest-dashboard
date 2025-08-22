import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  variant?: "default" | "card" | "text" | "avatar" | "button"
}

export function LoadingSkeleton({ className, variant = "default" }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded"

  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-3 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-9 w-20",
  }

  return <div className={cn(baseClasses, variants[variant], className)} role="status" aria-label="Loading..." />
}

export function LoadingCard() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <LoadingSkeleton variant="text" className="w-1/2" />
      <LoadingSkeleton variant="default" />
      <LoadingSkeleton variant="default" className="w-4/5" />
      <div className="flex gap-2 pt-2">
        <LoadingSkeleton variant="button" />
        <LoadingSkeleton variant="button" />
      </div>
    </div>
  )
}

export function LoadingStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 p-4 border rounded-lg">
          <LoadingSkeleton variant="text" className="w-1/3" />
          <LoadingSkeleton variant="default" className="h-8 w-2/3" />
          <LoadingSkeleton variant="text" className="w-1/2" />
        </div>
      ))}
    </div>
  )
}
