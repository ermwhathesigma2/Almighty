export default function AuthArt() {
  return (
    <section className="auth-art">
      <div className="logo-row">
        <div className="logo-tile">
          <img src="/images/logo.png" alt="" onError={e => e.target.remove()} />
          <span className="fallback-a">A</span>
        </div>
        <div className="logo-word">ALLMIGHTY</div>
      </div>
      <div className="eyebrow-w">MADE FOR EVERY HOME</div>
      <h2>Allmighty clean<br />starts here.</h2>
    </section>
  )
}
