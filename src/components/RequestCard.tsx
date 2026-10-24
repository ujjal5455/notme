import { formatDateTime, formatInr } from '../lib/format'
import { getEffectiveStatus } from '../lib/requestStatus'
import type { MoneyRequest } from '../types/domain'
import { StatusBadge } from './StatusBadge'

interface RequestCardProps {
  request: MoneyRequest
  nowMs: number
  onOpen: (requestId: string) => void
}

/** One tappable summary row in a list of requests. */
export function RequestCard({ request, nowMs, onOpen }: RequestCardProps) {
  return (
    <button type="button" className="request-card" onClick={() => onOpen(request.id)}>
      <span className="request-card-amount">{formatInr(request.amountInr)}</span>
      <StatusBadge status={getEffectiveStatus(request, nowMs)} />
      <span className="request-card-time">Sent {formatDateTime(request.createdAt)}</span>
    </button>
  )
}
