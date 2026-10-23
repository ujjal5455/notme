import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { fake } from './test/fakeSupabase'

// Every file that imports the real Supabase client gets the in-memory fake instead.
vi.mock('./lib/supabaseClient', async () => ({
  supabase: (await import('./test/fakeSupabase')).fake.supabase,
}))

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function renderApp() {
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
}

async function signUp(email: string) {
  await screen.findByRole('heading', { name: 'Sign in' })
  click(/create a demo account/i)
  type('Email', email)
  type('Password', 'demo-pass-1')
  click('Create account')
}

async function signIn(email: string, password = 'demo-pass-1') {
  await screen.findByRole('heading', { name: 'Sign in' })
  type('Email', email)
  type('Password', password)
  click('Sign in')
}

async function chooseRole(role: 'elder' | 'family', name: string) {
  await screen.findByRole('heading', { name: /who will use this phone/i })
  fireEvent.click(screen.getByLabelText(role === 'elder' ? /the elder/i : /a family member/i))
  type(/your name/i, name)
  click('Continue')
}

/** Elder signs up, chooses the role and shows a code. Returns nothing; the code is P38S-P4XS. */
async function elderShowsCode() {
  await signUp('elder1@example.com')
  await chooseRole('elder', '  Asha (demo) ')
  await screen.findByRole('heading', { name: /link your family member/i })
  click('Show a pairing code')
  await screen.findByText('P38S-P4XS')
}

beforeEach(() => {
  fake.reset()
})

describe('App gate (Phase 4: sign-in, role, pairing)', () => {
  it('starts on the sign-in screen with a made-up-data reminder', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText(/use a made-up email/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('links an elder and a family member with a one-time code', async () => {
    renderApp()

    // Elder: sign up → role → code with an in-person warning and a countdown.
    await elderShowsCode()
    expect(screen.getByText('P38S-P4XS')).toHaveAttribute('aria-label', 'Pairing code: P 3 8 S P 4 X S')
    expect(screen.getByText(/only in person/i)).toBeInTheDocument()
    expect(screen.getByText('Expires in 10:00')).toBeInTheDocument()

    // Checking before the family member has typed it keeps the code on screen.
    click('My family member has entered the code')
    expect(await screen.findByRole('alert')).toHaveTextContent(/not linked yet/i)
    expect(screen.getByText('P38S-P4XS')).toBeInTheDocument()

    // Family member (same device here; two devices in real life).
    click('Sign out')
    await signUp('family1@example.com')
    await chooseRole('family', 'Ravi (demo)')
    await screen.findByRole('heading', { name: /link with your elder/i })

    type(/pairing code/i, 'abc')
    click('Link')
    expect(screen.getByRole('alert')).toHaveTextContent(/8 letters and numbers/i)

    type(/pairing code/i, 'zzzz-zzzz')
    click('Link')
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not valid. Check it and try again.')

    type(/pairing code/i, 'p38s-p4xs') // lower case and a dash are fine
    click('Link')
    await screen.findByRole('heading', { name: /requests to confirm/i })
    expect(screen.getByText('Asha (demo)')).toBeInTheDocument() // name was trimmed by the "database"

    // Elder signs in again and goes straight to the home screen, linked with Ravi.
    click('Sign out')
    await signIn('elder1@example.com')
    expect(await screen.findByRole('heading', { name: /hello, asha \(demo\)/i })).toBeInTheDocument()
    expect(screen.getByText('Ravi (demo)')).toBeInTheDocument()
  })

  it('refuses a code that has already been used', async () => {
    renderApp()
    await elderShowsCode()
    click('Sign out')
    await signUp('family1@example.com')
    await chooseRole('family', 'Ravi (demo)')
    await screen.findByRole('heading', { name: /link with your elder/i })
    type(/pairing code/i, 'P38SP4XS')
    click('Link')
    await screen.findByRole('heading', { name: /requests to confirm/i })

    // A different, unrelated account tries the same code.
    click('Sign out')
    await signUp('stranger@example.com')
    await chooseRole('family', 'Stranger (demo)')
    await screen.findByRole('heading', { name: /link with your elder/i })
    type(/pairing code/i, 'P38SP4XS')
    click('Link')
    expect(await screen.findByRole('alert')).toHaveTextContent('That code has already been used. Ask for a new one.')
  })

  it('asks for a role before saving', async () => {
    renderApp()
    await signUp('elder1@example.com')
    await screen.findByRole('heading', { name: /who will use this phone/i })
    type(/your name/i, 'Asha (demo)')
    click('Continue')
    expect(screen.getByRole('alert')).toHaveTextContent('Choose who will use this phone.')
  })

  it('gives a general message for a wrong password', async () => {
    renderApp()
    await signUp('elder1@example.com')
    await screen.findByRole('heading', { name: /who will use this phone/i })
    click('Sign out')
    await signIn('elder1@example.com', 'wrong-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is not right. Please try again.')
  })

  it('cannot create a second account with the same email', async () => {
    renderApp()
    await signUp('elder1@example.com')
    await screen.findByRole('heading', { name: /who will use this phone/i })
    click('Sign out')
    await signUp('elder1@example.com')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not create the account/i)
  })

  it('shows a connection error with "Try again" instead of a blank screen', async () => {
    renderApp()
    await elderShowsCode()
    click('Sign out')

    fake.state.networkDown = true
    await signIn('elder1@example.com')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not connect/i)

    fake.state.networkDown = false
    await signIn('elder1@example.com')
    await screen.findByRole('heading', { name: /link your family member/i })

    // The network drops while the account is loading again.
    fake.state.networkDown = true
    click('Show a pairing code')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not connect/i)
  })
})
