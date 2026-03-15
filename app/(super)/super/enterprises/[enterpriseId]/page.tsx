import { redirect, notFound } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperEnterpriseDetailShell } from "@/components/super/super-enterprise-detail-shell";

type Params = { params: Promise<{ enterpriseId: string }> };

export default async function SuperEnterpriseDetailPage({ params }: Params) {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  const { enterpriseId } = await params;
  if (!enterpriseId) notFound();

  return <SuperEnterpriseDetailShell enterpriseId={enterpriseId} />;
}
