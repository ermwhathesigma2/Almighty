import { useState } from 'react'

export default function PasswordField({ id, name, label, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} name={name} type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button>
      </div>
    </div>
  )
}
