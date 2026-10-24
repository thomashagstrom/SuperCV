import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" action={signIn} />;
}
