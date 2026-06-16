/**
 * Login screen (spec screen "Login", route "/"). Centered card on the app
 * background: "Sign in to your account" heading, username + password (with
 * show/hide), Sign in button. On success -> /dashboard. Failure -> inline error.
 *
 * If a valid token already exists, the route layer (App.tsx) redirects to
 * /dashboard before this renders (spec flow Login: "existing valid token ->
 * auto land on /dashboard").
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Buttons';
import { PasswordField, TextField } from '../components/fields/Fields';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-appbg px-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/leaf.svg" alt="" aria-hidden="true" className="h-12 w-12" />
          <span className="text-lg font-semibold text-primary">Be The Tree Hugger</span>
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
