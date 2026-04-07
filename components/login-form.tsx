"use client";

import { AppActionForm } from "@/components/app-action-form";
import { loginAction } from "@/lib/actions";
import { KeyRound, LogIn, UserRound, Wrench } from "lucide-react";

export function LoginForm() {
  return (
    <div className="login-enterprise">
      <div className="login-brand">
        <div className="login-brand-mark" aria-hidden="true">
          <Wrench size={28} strokeWidth={1.75} color="#fff" />
        </div>
        <div className="login-brand-text">
          <h1>Asset maintenance</h1>
          <p>Operations &amp; work management</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-header">
          <h2>Sign in</h2>
          <p>Use your assigned user ID or work email and password.</p>
        </div>

        <AppActionForm action={loginAction} loadingText="Signing in…" className="login-form">
          <div className="form-group">
            <label htmlFor="login-username" className="login-label-with-icon">
              <UserRound size={14} strokeWidth={2} aria-hidden />
              User ID or email
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="e.g. user1 or alice@factory.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password" className="login-label-with-icon">
              <KeyRound size={14} strokeWidth={2} aria-hidden />
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter password"
            />
          </div>
          <div className="login-form-actions form-actions-with-icon">
            <button type="submit" className="btn btn-primary login-submit btn-with-icon">
              <LogIn size={18} strokeWidth={2} aria-hidden />
              Sign in
            </button>
          </div>
        </AppActionForm>

        <p className="login-footnote">
          Authorized personnel only. Activity may be monitored and recorded.
          <span className="login-footnote-block">Need access? Contact your IT administrator.</span>
        </p>
      </div>
    </div>
  );
}
