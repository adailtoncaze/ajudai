import { createClient } from "@/lib/supabase/server";

export async function SidebarUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return (
    <p className="ui-caption truncate px-3" title={user.email}>
      {user.email}
    </p>
  );
}
