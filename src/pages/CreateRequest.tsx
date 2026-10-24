import { RequestForm } from '../components/RequestForm'
import { REQUEST_TIMEOUT_SECONDS } from '../config'
import type { NewRequestInput, Profile } from '../types/domain'

interface CreateRequestProps {
  familyMember: Profile | undefined
  onSubmit: (input: NewRequestInput) => Promise<void>
  onCancel: () => void
}

export function CreateRequest({ familyMember, onSubmit, onCancel }: CreateRequestProps) {
  const familyName = familyMember?.displayName ?? 'Your family member'

  return (
    <section aria-labelledby="create-title">
      <h1 id="create-title">Send a money alert</h1>
      <p>
        Type the amount you are being asked to pay. <strong>{familyName}</strong> will see it and
        confirm or reject it. Do not pay until they answer.
      </p>
      <p className="notice">
        Demo: use made-up amounts only. Notme never sends money. {familyName} has{' '}
        {REQUEST_TIMEOUT_SECONDS} seconds to answer. That is kept short for the demo; it is not a
        recommended real-life waiting time.
      </p>

      <RequestForm onSubmit={onSubmit} onCancel={onCancel} />
    </section>
  )
}
