import { STATUS_LABELS, type ClassificationStatus } from '../types/vault.ts'
import './StatusBadge.css'

interface StatusBadgeProps {
  status: ClassificationStatus
  detail?: string | null
}

export function StatusBadge({ status, detail }: StatusBadgeProps) {
  return (
    <span className={`status status--${status}`} title={detail ?? undefined}>
      <span className="status__dot" />
      {STATUS_LABELS[status]}
    </span>
  )
}
