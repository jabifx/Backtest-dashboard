import { useToast as useToastOriginal } from "@/hooks/use-toast"

export function useToastEnhanced() {
  const { toast } = useToastOriginal()

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      className: "border-green-200 bg-green-50 text-green-900",
    })
  }

  const showError = (title: string, description?: string, error?: Error) => {
    toast({
      title,
      description: description || error?.message,
      variant: "destructive",
      duration: 6000, // Longer duration for errors
    })
  }

  const showWarning = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: "border-yellow-200 bg-yellow-50 text-yellow-900",
    })
  }

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: "border-blue-200 bg-blue-50 text-blue-900",
    })
  }

  const showLoading = (title: string, description?: string) => {
    return toast({
      title,
      description,
      duration: Number.POSITIVE_INFINITY, // Don't auto-dismiss loading toasts
      className: "border-gray-200 bg-gray-50 text-gray-900",
    })
  }

  return {
    toast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
  }
}
