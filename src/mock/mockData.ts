// SYNTHETIC demo data. No real people, numbers or UPI IDs.
// These are the starting requests; new ones are added in App.tsx state (Phase 2).
// Phase 5 replaces this with rows loaded from Supabase.
import type { MoneyRequest, Profile } from '../types/domain'

export const mockElder: Profile = {
  id: 'elder-1',
  displayName: 'Asha (demo)',
  role: 'elder',
}

export const mockFamily: Profile = {
  id: 'family-1',
  displayName: 'Ravi (demo)',
  role: 'family',
}

const mockProfiles: Profile[] = [mockElder, mockFamily]

export function findProfile(id: string): Profile | undefined {
  return mockProfiles.find((profile) => profile.id === id)
}

// Times are relative to when the page loads, so a "pending" request
// still has time left whenever you open the app.
const now = Date.now()
const minutes = (n: number) => new Date(now + n * 60_000).toISOString()

export const mockRequests: MoneyRequest[] = [
  {
    id: 'req-1',
    elderId: mockElder.id,
    familyId: mockFamily.id,
    amountInr: 25000,
    recipient: 'hospital.desk@demo-upi',
    note: 'Caller said Ravi needs money for a hospital bill',
    status: 'pending',
    createdAt: minutes(-1),
    expiresAt: minutes(9),
    respondedAt: null,
  },
  {
    id: 'req-2',
    elderId: mockElder.id,
    familyId: mockFamily.id,
    amountInr: 1500,
    recipient: 'electricity.bill@demo-upi',
    note: null,
    status: 'approved',
    createdAt: minutes(-60),
    expiresAt: minutes(-50),
    respondedAt: minutes(-58),
  },
  {
    id: 'req-3',
    elderId: mockElder.id,
    familyId: mockFamily.id,
    amountInr: 80000,
    recipient: 'unknown.agent@demo-upi',
    note: 'Urgent bail money, do not tell anyone',
    status: 'rejected',
    createdAt: minutes(-180),
    expiresAt: minutes(-170),
    respondedAt: minutes(-178),
  },
  {
    id: 'req-4',
    elderId: mockElder.id,
    familyId: mockFamily.id,
    amountInr: 5000,
    recipient: 'travel.refund@demo-upi',
    note: null,
    // Saved as pending, but its deadline has passed, so the app SHOWS it as expired.
    status: 'pending',
    createdAt: minutes(-1440),
    expiresAt: minutes(-1430),
    respondedAt: null,
  },
]
