'use client';

import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactNode } from 'react';

import { getFirebase } from '@/lib/firebase';

import SignIn from './SignIn';

/** Shows the sign-in form until someone is signed in, then renders `children`. */
export default function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  // undefined = still finding out, null = signed out.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(getFirebase().auth, setUser), []);

  if (user === undefined) return <Typography>Loading…</Typography>;
  if (user === null) return <SignIn />;
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography>Signed in as {user.email ?? user.uid}</Typography>
        <Button size="small" onClick={() => void signOut(getFirebase().auth)}>
          Sign out
        </Button>
      </Stack>
      {children(user)}
    </>
  );
}
