// Server-only : audience "wallet-active" d'un commerçant.
export type WalletAudience = {
  apple: string[];
  google: string[];
  /** Clients Google sans pass Apple (pour éviter le double comptage). */
  googleOnly: string[];
};

export async function getWalletAudienceFor(merchantId: string): Promise<WalletAudience> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, google_wallet_pass_id")
    .eq("merchant_id", merchantId);
  const ids = (customers ?? []).map((c) => c.id);
  if (!ids.length) return { apple: [], google: [], googleOnly: [] };

  const { data: regs } = await supabaseAdmin
    .from("apple_pass_registrations")
    .select("serial_number")
    .in("serial_number", ids);
  const apple = [...new Set((regs ?? []).map((r) => r.serial_number))];
  const google = (customers ?? []).filter((c) => c.google_wallet_pass_id).map((c) => c.id);
  const appleSet = new Set(apple);
  return { apple, google, googleOnly: google.filter((id) => !appleSet.has(id)) };
}
