import type { RequestStatus } from '../types/domain'

// Each status has words AND a symbol, so meaning never depends on colour alone.
const STATUS_LABELS: Record<RequestStatus, { icon: string; label: string }> = {
  pending: { icon: '⏳', label: 'Waiting for family' },
  approved: { icon: '✓', label: 'Confirmed by family' },
  rejected: { icon: '✕', label: 'Rejected by family' },
  expired: { icon: '!', label: 'Unconfirmed — no reply' },
}

interface StatusBadgeProps {
  status: RequestStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { icon, label } = STATUS_LABELS[status]
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  )
}
