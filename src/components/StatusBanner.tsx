import type { RequestStatus } from '../types/domain'
import { WarningPanel } from './WarningPanel'

interface StatusBannerProps {
  status: RequestStatus
  familyName: string
}

/** What the ELDER sees about their request, and what to do next. */
export function StatusBanner({ status, familyName }: StatusBannerProps) {
  switch (status) {
    case 'pending':
      return (
        <div className="banner banner-pending" role="status">
          <p className="banner-title">Waiting for {familyName} to confirm.</p>
          <p>Do not pay yet. Their answer will appear here by itself.</p>
        </div>
      )
    case 'approved':
      return (
        <div className="banner banner-approved" role="status">
          <p className="banner-title">{familyName} confirmed these details.</p>
          <p>
            This means {familyName} agrees with the amount and recipient. It does not prove the
            recipient is safe, so check the UPI ID again before paying.
          </p>
        </div>
      )
    case 'rejected':
    case 'expired':
      return <WarningPanel reason={status} familyName={familyName} />
  }
}
