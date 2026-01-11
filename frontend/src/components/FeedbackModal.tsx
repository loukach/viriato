import { useState, useRef, useEffect } from 'react'
import { API_URL } from '../lib/api'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setEmail('')
      setHoneypot('')
      setError('')
      setIsSuccess(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          email: email.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar feedback')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar feedback')
      setIsSubmitting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[550px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Enviar Feedback</h2>
            <p className="text-sm text-gray-500 mt-1">Ajude-nos a melhorar o Viriato</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Obrigado pelo seu feedback!
              </h3>
              <p className="text-gray-500 mb-6">
                A sua sugestao foi registada e sera analisada pela equipa.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titulo
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  id="feedback-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sugestao de nova funcionalidade"
                  required
                  minLength={5}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao
                </label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a sua sugestao, problema encontrado ou ideia de melhoria..."
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-shadow resize-y"
                />
              </div>

              <div>
                <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  id="feedback-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Para recebermos resposta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-shadow"
                />
              </div>

              {/* Honeypot field - hidden from users, catches bots */}
              <input
                type="text"
                name="honeypot"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute -left-[9999px] opacity-0"
                tabIndex={-1}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    A enviar...
                  </>
                ) : (
                  'Enviar Feedback'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
