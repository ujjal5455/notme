import { formatDateTime, formatInr } from '../lib/format'
import type { MoneyRequest } from '../types/domain'
import { StatusBadge } from './StatusBadge'

interface RequestCardProps {
  request: MoneyRequest
  onOpen: (requestId: string) => void
}

/** One tappable summary row in a list of requests. */
export function RequestCard({ request, onOpen }: RequestCardProps) {
  return (
    <button type="button" className="request-card" onClick={() => onOpen(request.id)}>
      <span className="request-card-amount">{formatInr(request.amountInr)}</span>
      <span className="request-card-recipient">to {request.recipient}</span>
      <StatusBadge status={request.status} />
      <span className="request-card-time">Sent {formatDateTime(request.createdAt)}</span>
    </button>
  )
}
