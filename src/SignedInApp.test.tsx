import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignedInApp } from './SignedInApp'
import { fake } from './test/fakeSupabase'
import type { Profile } from './types/domain'

vi.mock('./lib/supabaseClient', async () => ({
  supabase: (await import('./test/fakeSupabase')).fake.supabase,
}))

let asha: Profile
let ravi: Profile

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

async function renderAsElder(onSignOut = () => {}) {
  await fake.signInAs('elder1@example.com')
  const view = render(<SignedInApp profile={asha} linkedPerson={ravi} onSignOut={onSignOut} />)
  await screen.findByRole('heading', { level: 1, name: /hello, asha/i })
  return view
}

async function renderAsFamily() {
  await fake.signInAs('family1@example.com')
  const view = render(<SignedInApp profile={ravi} linkedPerson={asha} onSignOut={() => {}} />)
  await screen.findByRole('heading', { name: /requests to confirm/i })
  return view
}

/** As the elder: fill in and send a request for ₹2,500. */
function fillAndSend(amount = '2500', recipient = ' test.shop@demo-upi ') {
  click(/check a money request/i)
  fireEvent.change(screen.getByLabelText(/amount in rupees/i), { target: { value: amount } })
  fireEvent.change(screen.getByLabelText(/who are you paying/i), { target: { value: recipient } })
  click(/send to family/i)
}

beforeEach(async () => {
  fake.reset()
  ;({ elder: asha, family: ravi } = await fake.createPairedAccounts())
})

describe('SignedInApp (Phase 5: requests saved in Supabase)', () => {
  it('shows "Loading your requests…" first, then the elder home', async () => {
    await fake.signInAs('elder1@example.com')
    render(<SignedInApp profile={asha} linkedPerson={ravi} onSignOut={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your requests…')
    expect(await screen.findByText(/you have not sent any requests yet/i)).toBeInTheDocument()
  })

  it('elder can sign out, and has no role switch', async () => {
    const onSignOut = vi.fn()
    await renderAsElder(onSignOut)
    expect(screen.queryByRole('button', { name: 'Family' })).not.toBeInTheDocument()
    click('Sign out')
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('elder creates a request: it is saved, and the screen waits for Ravi', async () => {
    await renderAsElder()
    fillAndSend()
    expect(await screen.findByRole('heading', { level: 1, name: '₹2,500' })).toBeInTheDocument()
    expect(screen.getByText('test.shop@demo-upi')).toBeInTheDocument() // trimmed by the "database"
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for ravi \(demo\) to confirm/i)
    expect(screen.queryByRole('button', { name: 'Confirm request' })).not.toBeInTheDocument()
  })

  it('the request is delivered to the linked family member, and survives a reload', async () => {
    const elderView = await renderAsElder()
    fillAndSend()
    await screen.findByRole('heading', { level: 1, name: '₹2,500' })
    elderView.unmount()

    // Ravi opens the app (another device in real life).
    const familyView = await renderAsFamily()
    const waiting = screen.getByRole('heading', { name: /waiting for your answer/i }).nextElementSibling as HTMLElement
    expect(within(waiting).getByRole('button', { name: /₹2,500/ })).toBeInTheDocument()
    click(/₹2,500/)
    expect(screen.getByText('test.shop@demo-upi')).toBeInTheDocument()
    expect(screen.getByText('Asha (demo)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm request' })).toBeInTheDocument()
    familyView.unmount()

    // Asha reloads: her request is still there.
    await renderAsElder()
    expect(screen.getByRole('button', { name: /₹2,500/ })).toBeInTheDocument()
  })

  it('family member sees new requests after "Check for new requests"', async () => {
    await renderAsFamily()
    expect(screen.getByText(/nothing is waiting for you/i)).toBeInTheDocument()

    // Asha sends a request while Ravi's screen is open.
    await fake.signInAs('elder1@example.com')
    await fake.supabase.rpc('create_money_request', { p_amount_inr: 900, p_recipient: 'shop@demo-upi' })
    await fake.signInAs('family1@example.com')

    click('Check for new requests')
    expect(await screen.findByRole('button', { name: /₹900/ })).toBeInTheDocument()
  })

  it('shows a saved request whose deadline passed as an "unconfirmed" warning', async () => {
    fake.insertRow('money_requests', {
      id: 'req-old',
      elder_id: asha.id,
      family_id: ravi.id,
      amount_inr: 5000,
      recipient: 'late.reply@demo-upi',
      note: null,
      status: 'pending',
      created_at: new Date(Date.now() - 120_000).toISOString(),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      responded_at: null,
    })
    await renderAsElder()
    click(/₹5,000/)
    expect(screen.getByRole('alert')).toHaveTextContent(/has not been confirmed/i)
  })

  it('keeps the form and shows a message when sending fails', async () => {
    await renderAsElder()
    fake.state.networkDown = true
    fillAndSend()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not connect/i)
    expect(screen.getByRole('heading', { name: /check a money request/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/amount in rupees/i)).toHaveValue('2500')

    fake.state.networkDown = false
    click(/send to family/i)
    expect(await screen.findByRole('heading', { level: 1, name: '₹2,500' })).toBeInTheDocument()
  })

  it('says so when the list cannot be loaded, and recovers with "Try again"', async () => {
    fake.state.networkDown = true
    await fake.signInAs('elder1@example.com') // sign-in itself happened earlier, before the network dropped
    render(<SignedInApp profile={asha} linkedPerson={ravi} onSignOut={() => {}} />)
    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent(/can't reach the server/i)
    expect(warning).toHaveTextContent(/don't pay until you can see your family member's answer/i)

    fake.state.networkDown = false
    click('Try again')
    expect(await screen.findByText(/you have not sent any requests yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows helpful text for an invalid amount and sends nothing', async () => {
    await renderAsElder()
    fillAndSend('-50')
    expect(screen.getByText(/whole rupees and numbers only/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /check a money request/i })).toBeInTheDocument()
  })
})

/** As Asha, save a ₹2,500 request straight in the fake (as if sent earlier). Returns its id. */
async function savedRequest(): Promise<string> {
  await fake.signInAs('elder1@example.com')
  const { data } = await fake.supabase.rpc('create_money_request', {
    p_amount_inr: 2500,
    p_recipient: 'test.shop@demo-upi',
  })
  return String((data as { id: string }).id)
}

describe('SignedInApp (Phase 6: answers and live updates)', () => {
  it('family member confirms; the saved answer is shown', async () => {
    await savedRequest()
    await renderAsFamily()
    click(/₹2,500/)
    click('Confirm request')
    expect(await screen.findByText(/you confirmed this request/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm request/i })).not.toBeInTheDocument()
  })

  it("the elder's screen shows a rejection by itself, without Refresh", async () => {
    const id = await savedRequest()
    await renderAsElder()
    click(/₹2,500/)
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for ravi/i)

    // Ravi rejects on his own phone.
    await fake.signInAs('family1@example.com')
    await fake.supabase.rpc('respond_to_request', { p_request_id: id, p_decision: 'rejected' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/pause\. this request has not been confirmed/i)
  })

  it("the elder's screen shows a confirmation by itself", async () => {
    const id = await savedRequest()
    await renderAsElder()
    click(/₹2,500/)
    await fake.signInAs('family1@example.com')
    await fake.supabase.rpc('respond_to_request', { p_request_id: id, p_decision: 'approved' })
    expect(await screen.findByText(/ravi \(demo\) confirmed these details/i)).toBeInTheDocument()
    expect(screen.getByText(/does not prove the recipient is safe/i)).toBeInTheDocument()
  })

  it('a second answer from an out-of-date screen is refused, and the screen catches up', async () => {
    fake.state.realtime = 'fail' // so Ravi's screen does not update by itself
    const id = await savedRequest()
    await renderAsFamily()
    click(/₹2,500/)

    // The request gets answered elsewhere (e.g. Ravi's other phone).
    await fake.supabase.rpc('respond_to_request', { p_request_id: id, p_decision: 'approved' })

    click('Reject request')
    expect(await screen.findByRole('alert')).toHaveTextContent('This request has already been answered.')
    expect(await screen.findByText(/you confirmed this request/i)).toBeInTheDocument()
  })

  it('says so when live updates are not connected', async () => {
    fake.state.realtime = 'fail'
    await renderAsElder()
    expect(await screen.findByText(/checking for updates every few seconds/i)).toBeInTheDocument()
  })
})
