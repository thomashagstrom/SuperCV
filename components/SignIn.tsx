'use client';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';

import { describeError, reportError } from '@/lib/friendly-errors';
import { getFirebase } from '@/lib/firebase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      // Never swallowed: the real code goes to the console, the person gets a sentence.
      reportError('sign-in', e);
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    void run(() => signInWithEmailAndPassword(getFirebase().auth, email, password));
  }

  return (
    <Stack component="form" onSubmit={signIn} spacing={2} sx={{ maxWidth: 384 }}>
      <TextField
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        slotProps={{ htmlInput: { minLength: 6 } }}
      />
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button type="submit" variant="contained" disabled={busy}>
          Sign in
        </Button>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            void run(() => createUserWithEmailAndPassword(getFirebase().auth, email, password))
          }
        >
          Create account
        </Button>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            void run(() => signInWithPopup(getFirebase().auth, new GoogleAuthProvider()))
          }
        >
          Continue with Google
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
