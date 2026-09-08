"use client";

import { useState } from "react";

export default function AccountPanel({ account, displayName, redirectTo }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      account.setMessage({ type: "error", text: "Enter an email and a password with at least 6 characters." });
      return;
    }
    setBusy(true);
    if (mode === "signin") await account.signIn(email, password);
    else await account.signUp(email, password, displayName || "");
    setBusy(false);
  }

  if (account.loading) return <div className="account-card"><span className="account-dot" />Checking account…</div>;

  if (account.user) return (
    <div className="account-card account-signed-in">
      <div><span className="eyebrow">Cloud profile</span><h3>Synced across your devices</h3><p>{account.user.email}</p></div>
      <button type="button" className="account-secondary" onClick={account.signOut}>Sign out</button>
      {account.message && <div className={`account-message ${account.message.type}`}>{account.message.text}</div>}
    </div>
  );

  return (
    <div className="account-card">
      <div className="account-card-head"><div><span className="eyebrow">Private Wayfare account</span><h3>Sign in to continue</h3><p>Your plans and expenses are only available to authenticated group members.</p></div></div>
      <button type="button" className="google-signin-button" onClick={() => account.signInWithGoogle(redirectTo)}>
        <span className="google-mark" aria-hidden="true">G</span>
        Continue with Google
      </button>
      <div className="account-divider"><span>or use email</span></div>
      <div className="account-tabs">
        <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
      </div>
      <form className="account-form" onSubmit={submit}>
        <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label><span>Password</span><input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {account.message && <div className={`account-message ${account.message.type}`}>{account.message.text}</div>}
      <p className="account-security-note">Wayfare never receives your Google password.</p>
    </div>
  );
}
