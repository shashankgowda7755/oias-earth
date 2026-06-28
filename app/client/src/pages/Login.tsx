/**
 * Login screen (spec screen "Login", route "/"). Centered card on the app
 * background: "Sign in to your account" heading, username + password (with
 * show/hide), Sign in button. On success -> /dashboard. Failure -> inline error.
 *
 * If a valid token already exists, the route layer (App.tsx) redirects to
 * /dashboard before this renders (spec flow Login: "existing valid token ->
 * auto land on /dashboard").
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Buttons';
import { PasswordField, TextField } from '../components/fields/Fields';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInDemo, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Pre-launch: try a password-free admin sign-in first. Falls back to the form
  // if the server has demo login disabled (ALLOW_DEMO_LOGIN=false) or it fails.
  const [autoTrying, setAutoTrying] = useState(true);
  const autoRan = useRef(false);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
    signInDemo()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setAutoTrying(false)); // reveal the manual form
  }, [isAuthenticated, navigate, signInDemo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Unable to sign in. Please check your credentials.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (autoTrying) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-appbg px-4">
        <img src="/oias-mark.svg" alt="" aria-hidden="true" className="h-12 w-12" />
        <p className="text-sm text-textSecondary">Signing you in…</p>
        <button
          type="button"
          onClick={() => setAutoTrying(false)}
          className="text-sm text-textSecondary underline underline-offset-2"
        >
          Use a password instead
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-appbg px-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/oias-mark.svg" alt="" aria-hidden="true" className="h-12 w-12" />
          <span className="font-serif text-2xl font-semibold tracking-tight text-textPrimary">OIAS Earth</span>
        </div>

        <h1 className="mb-6 text-center text-xl font-semibold text-textPrimary">
          Sign in to your account
        </h1>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-button border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField
            label="User name"
            name="username"
            value={username}
            onChange={setUsername}
            required
            autoComplete="username"
            disabled={submitting}
          />
          <PasswordField
            label="Password"
            name="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            disabled={submitting}
          />
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="w-full"
          >
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
