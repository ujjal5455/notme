export function AboutSafety() {
  return (
    <section aria-labelledby="about-title">
      <h1 id="about-title">How Notme helps you check before you pay</h1>
      <p>
        Scammers can copy a family member&apos;s voice and ask you for money urgently. Notme does
        not try to detect fake voices, and it does not ask you to judge the call. You type only the
        amount you are being asked for, and the family member you linked with in advance checks it
        for you: they call you on a number you already trust, then confirm or reject it.
      </p>

      <h2>What the answers mean</h2>
      <ul className="plain-list">
        <li>
          <strong>Confirmed:</strong> your family member knows about this payment and agrees with
          the amount. It does not prove that paying is safe.
        </li>
        <li>
          <strong>Rejected:</strong> your family member says this request is not genuine. Do not
          pay unless you speak to them directly and they say it is.
        </li>
        <li>
          <strong>No reply:</strong> the request is unconfirmed. That does not prove it is a scam,
          but do not pay until you reach your family member on a number you already trust.
        </li>
      </ul>

      <h2>What Notme does not do</h2>
      <ul className="plain-list">
        <li>It never sends real money.</li>
        <li>It does not listen to or block phone calls.</li>
        <li>It is a hackathon prototype, not an emergency service.</li>
      </ul>
    </section>
  )
}
