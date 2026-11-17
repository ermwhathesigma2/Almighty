import { useState } from 'react'
import AuthArt from '../components/AuthArt.jsx'
import PasswordField from '../components/PasswordField.jsx'
import AuthError from '../components/AuthError.jsx'

const ArrowIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </svg>
)

export default function Signup() {
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const f = e.target
    if (!terms) return setError('Please agree to the Terms of Service and Privacy Policy.')
    if (f.password.value !== f.confirm.value) return setError('Passwords do not match.')
    const r = DB.Auth.signup({ name: f.name.value, email: f.email.value, password: f.password.value })
    if (r.error) return setError(r.error)
    DB.Auth.login(f.email.value, f.password.value, true)
    location.replace(DB.Auth.home('customer'))
  }

  return (
    <div className="auth">
      <AuthArt />
      <section className="auth-panel">
        <div className="auth-form">
          <div className="seg">
            <a href="login.html">Log in</a>
            <a className="on" href="signup.html">Sign up</a>
          </div>
          <div className="auth-eyebrow">Join Allmighty</div>
          <h1>Create your account</h1>
          <p className="lead">Start shopping for everyday essentials.</p>

          <form onSubmit={handleSubmit} noValidate>
            <AuthError message={error} />
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" placeholder="e.g. Maria Reyes" autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" placeholder="you@gmail.com" autoComplete="email" />
            </div>
            <PasswordField id="pw" name="password" label="Password" placeholder="At least 8 characters" autoComplete="new-password" />
            <PasswordField id="pw2" name="confirm" label="Confirm password" placeholder="Enter password again" autoComplete="new-password" />
            <label className="check" style={{ marginBottom: '6px' }}>
              <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
              <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span>
            </label>
            <button className="auth-btn" type="submit" disabled={!terms}>Create Account <ArrowIcon /></button>
          </form>

          <p className="auth-foot">Already have an account? <b><a href="login.html">Log in</a></b></p>
        </div>
      </section>
    </div>
  )
}
