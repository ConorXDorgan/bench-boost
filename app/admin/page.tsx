import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getViewerAccess } from "@/lib/viewerAccess";
import ViewerPasswordForm from "@/components/ViewerPasswordForm";

export default async function AdminPage() {
  if (!(await getAdminSession())) redirect("/");
  const access = await getViewerAccess();

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          Admin
        </p>
        <h1 className="acn-rule text-3xl font-semibold tracking-tight text-black">Settings</h1>

        <ViewerPasswordForm
          initial={{
            enabled: !!access?.passwordHash,
            updatedAt: access?.updatedAt.toISOString() ?? null,
            updatedBy: access?.updatedBy ?? null,
          }}
        />
      </main>
    </div>
  );
}
