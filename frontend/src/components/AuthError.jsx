export default function AuthError({ message }) {
  if (!message) return null
  return <div className="auth-error">{message}</div>
}
