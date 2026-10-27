import { redirect } from "next/navigation";

export default function LoginRedirect() {
  redirect("/en/login");
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
