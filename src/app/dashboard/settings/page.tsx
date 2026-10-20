import { requireUser } from "@/lib/supabase";
import { emailConfigured } from "@/lib/email";
import { ProfileForm } from "@/components/profile-form";

export default async function Settings() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <ProfileForm name={(user.user_metadata?.display_name as string) ?? ""} email={user.email ?? ""} />
      <div className="card max-w-md text-sm"><p className="font-medium">Email delivery</p>
        <p className="mt-1 text-slate-600">{emailConfigured() ? "Email provider is configured." : "Not configured. Add RESEND_API_KEY to enable emails."}</p></div>
    </div>
  );
}
