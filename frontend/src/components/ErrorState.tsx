interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Erro ao carregar dados',
  message = 'O servidor pode estar a iniciar (aguarde 10-30 segundos) ou houve um problema de ligacao.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
