interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = 'A carregar...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
