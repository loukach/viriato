interface StatCardProps {
  value: string | number
  label: string
  className?: string
  style?: React.CSSProperties
}

export function StatCard({ value, label, className = '', style }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 text-center ${className}`} style={style}>
      <div className="text-2xl font-bold text-[var(--primary)]">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}
