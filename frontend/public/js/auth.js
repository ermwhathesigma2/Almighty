/* Login + Sign up pages */
(function () {
  'use strict';
  const { esc, icon } = UI;

  const art = `<section class="auth-art">
      <div class="logo-row"><div class="logo-tile"><img src="../images/logo.png" alt="" onerror="this.remove();this.parentNode&&0"><span class="fallback-a">A</span></div><div class="logo-word">ALLMIGHTY</div></div>
      <div class="eyebrow-w">MADE FOR EVERY HOME</div>
      <h2>Allmighty clean<br>starts here.</h2>
    </section>`;

  function pwField(id, label, placeholder, name) {
    return `<div class="field"><label for="${id}">${label}</label>
      <div class="pw"><input id="${id}" name="${name || id}" type="password" placeholder="${placeholder}" autocomplete="${id === 'pw' ? 'current-password' : 'new-password'}"><button type="button" data-act="togglepw" data-for="${id}">Show</button></div></div>`;
  }
  UI.on('togglepw', t => {
    const i = document.getElementById(t.dataset.for);
    const show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    t.textContent = show ? 'Hide' : 'Show';
  });

  // hide the "A" placeholder when a real logo loads
  function logoFix() {
    const img = document.querySelector('.logo-tile img'), fb = document.querySelector('.fallback-a');
    if (!img || !fb) return;
    const ok = () => { fb.style.display = 'none'; };
    if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok);
  }

  function redirectIfLoggedIn() {
    const u = DB.Auth.current();
    if (u) { location.replace(DB.Auth.home(u.role)); return true; }
    return false;
  }

  function login() {
    if (redirectIfLoggedIn()) return;
    document.getElementById('app').innerHTML = `<div class="auth">${art}
      <section class="auth-panel"><div class="auth-form">
        <div class="seg"><a class="on" href="login.html">Log in</a><a href="signup.html">Sign up</a></div>
        <div class="auth-eyebrow">Welcome back</div>
        <h1>Log in to your account</h1>
        <p class="lead">Enter your details to continue.</p>
        <form data-form="login" novalidate>
          <div id="err"></div>
          <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" placeholder="you@gmail.com" autocomplete="username"></div>
          ${pwField('pw', 'Password', 'Enter your password', 'password')}
          <div class="auth-row"><label class="check"><input type="checkbox" name="remember"> Remember me</label><b><a href="#" data-act="forgot">Forgot password?</a></b></div>
          <button class="auth-btn" type="submit">Log In ${icon('arrow', 22)}</button>
        </form>
        <p class="auth-foot">New to Allmighty? <b><a href="signup.html">Create account</a></b></p>
      </div></section></div>`;
    logoFix();
    UI.form('login', f => {
      const r = DB.Auth.login(f.email.value, f.password.value, f.remember.checked);
      if (r.error) { document.getElementById('err').innerHTML = `<div class="auth-error">${esc(r.error)}</div>`; return; }
      location.replace(DB.Auth.home(r.user.role));
    });
    UI.on('forgot', () => UI.modal(`<h2>Forgot your password?</h2>
      <p class="sub">Password reset by email needs a mail service, which comes with the online version. For now, please ask the store admin to help you get back into your account.</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Okay</button></div>`));
  }

  function signup() {
    if (redirectIfLoggedIn()) return;
    document.getElementById('app').innerHTML = `<div class="auth">${art}
      <section class="auth-panel"><div class="auth-form">
        <div class="seg"><a href="login.html">Log in</a><a class="on" href="signup.html">Sign up</a></div>
        <div class="auth-eyebrow">Join Allmighty</div>
        <h1>Create your account</h1>
        <p class="lead">Start shopping for everyday essentials.</p>
        <form data-form="signup" novalidate>
          <div id="err"></div>
          <div class="field"><label for="name">Full name</label><input id="name" name="name" placeholder="e.g. Maria Reyes" autocomplete="name"></div>
          <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" placeholder="you@gmail.com" autocomplete="email"></div>
          ${pwField('pw', 'Password', 'At least 8 characters', 'password')}
          ${pwField('pw2', 'Confirm password', 'Enter password again', 'confirm')}
          <label class="check" style="margin-bottom:6px"><input type="checkbox" name="terms" id="terms"> <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span></label>
          <button class="auth-btn" id="go" type="submit" disabled>Create Account ${icon('arrow', 22)}</button>
        </form>
        <p class="auth-foot">Already have an account? <b><a href="login.html">Log in</a></b></p>
      </div></section></div>`;
    logoFix();
    const terms = document.getElementById('terms'), go = document.getElementById('go');
    terms.addEventListener('change', () => { go.disabled = !terms.checked; });
    UI.form('signup', f => {
      const show = m => { document.getElementById('err').innerHTML = `<div class="auth-error">${esc(m)}</div>`; };
      if (!f.terms.checked) return show('Please agree to the Terms of Service and Privacy Policy.');
      if (f.password.value !== f.confirm.value) return show('Passwords do not match.');
      const r = DB.Auth.signup({ name: f.name.value, email: f.email.value, password: f.password.value });
      if (r.error) return show(r.error);
      DB.Auth.login(f.email.value, f.password.value, true);
      location.replace(DB.Auth.home('customer'));
    });
  }

  window.AuthPages = { login, signup };
})();
