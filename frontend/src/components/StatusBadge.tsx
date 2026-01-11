import { getStatusCategory } from '../lib/statusCategories'

interface StatusBadgeProps {
  status: string
  inline?: boolean
}

export function StatusBadge({ status, inline = false }: StatusBadgeProps) {
  const statusInfo = getStatusCategory(status)

  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium'
  const colorClasses: Record<string, string> = {
    'status-submitted': 'bg-gray-100 text-gray-700',
    'status-announced': 'bg-sky-100 text-sky-700',
    'status-discussion': 'bg-blue-100 text-blue-700',
    'status-voting': 'bg-orange-100 text-orange-700',
    'status-finalizing': 'bg-purple-100 text-purple-700',
    'status-approved': 'bg-green-100 text-green-700',
    'status-rejected': 'bg-red-100 text-red-700',
  }

  const Tag = inline ? 'span' : 'div'

  return (
    <Tag className={`${baseClasses} ${colorClasses[statusInfo.cssClass] || ''}`} title={status}>
      {statusInfo.label}
    </Tag>
  )
}
