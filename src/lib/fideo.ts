import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BRAND_LOGO =
  "https://res.cloudinary.com/dgfdye7cl/image/upload/v1785332228/3F3112CB-3549-42D3-8EE2-5B1F9C118801_ikxoy5.png";

export type Merchant = {
  id: string;
  nom_commerce: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  logo_url: string | null;
  couleur_marque: string | null;
  trial_ends_at: string;
  access_status: string;
};

export type LoyaltyCard = {
  id: string;
  merchant_id: string;
  nb_points_pour_recompense: number;
  valeur_recompense: string;
  design: unknown;
  mode_recompense: string;
  montant_pour_recompense: number;
};

export type Employee = {
  id: string;
  nom: string;
  pin_code: string;
  role: string;
};

export type Establishment = {
  id: string;
  nom: string;
  adresse: string | null;
  public_code: string;
};

export type Customer = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  created_at: string;
  apple_wallet_pass_id: string | null;
  google_wallet_pass_id: string | null;
};

export type PointEntry = {
  id: string;
  customer_id: string;
  employee_id: string | null;
  establishment_id: string | null;
  points_ajoutes: number;
  montant: number;
  type: string;
  date: string;
};

export function useMerchant() {
  return useQuery({
    queryKey: ["merchant"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const { data, error } = await supabase
        .from("merchants")
        .select(
          "id, nom_commerce, email, telephone, adresse, logo_url, couleur_marque, trial_ends_at, access_status",
        )
        .eq("user_id", uid ?? "")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Merchant | null) ?? null;
    },
  });
}

/* ---------- Admin ---------- */

export type AdminMerchant = Merchant & { created_at: string; clients: number };

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is_admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}

export function useAllMerchants(enabled: boolean) {
  return useQuery({
    queryKey: ["all_merchants"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select(
          "id, nom_commerce, email, telephone, adresse, logo_url, couleur_marque, created_at, trial_ends_at, access_status",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: customers } = await supabase.from("customers").select("merchant_id");
      const counts = new Map<string, number>();
      for (const c of customers ?? []) {
        counts.set(c.merchant_id, (counts.get(c.merchant_id) ?? 0) + 1);
      }
      return (data ?? []).map((m) => ({
        ...(m as Merchant & { created_at: string }),
        clients: counts.get(m.id) ?? 0,
      })) as AdminMerchant[];
    },
  });
}

export function useLoyaltyCard(merchantId?: string) {
  return useQuery({
    queryKey: ["loyalty_card", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_cards")
        .select("*")
        .eq("merchant_id", merchantId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as LoyaltyCard | null) ?? null;
    },
  });
}

export function useEmployees(merchantId?: string) {
  return useQuery({
    queryKey: ["employees", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nom, pin_code, role")
        .eq("merchant_id", merchantId!)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });
}

export function useEstablishments(merchantId?: string) {
  return useQuery({
    queryKey: ["establishments", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishments")
        .select("id, nom, adresse, public_code")
        .eq("merchant_id", merchantId!)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Establishment[];
    },
  });
}

export function useCustomers(merchantId?: string) {
  return useQuery({
    queryKey: ["customers", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, nom, prenom, email, telephone, created_at, apple_wallet_pass_id, google_wallet_pass_id",
        )
        .eq("merchant_id", merchantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function usePoints(customerIds: string[] | undefined) {
  return useQuery({
    queryKey: ["points", customerIds?.length ?? 0, customerIds?.[0] ?? ""],
    enabled: !!customerIds && customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_history")
        .select("id, customer_id, employee_id, establishment_id, points_ajoutes, montant, type, date")
        .in("customer_id", customerIds!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PointEntry[];
    },
  });
}

export function useRewards(customerIds: string[] | undefined) {
  return useQuery({
    queryKey: ["rewards", customerIds?.length ?? 0, customerIds?.[0] ?? ""],
    enabled: !!customerIds && customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards_redeemed")
        .select("id, customer_id, valeur, date")
        .in("customer_id", customerIds!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; customer_id: string; valeur: string | null; date: string }[];
    },
  });
}

export function useInvalidateFideo() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries();
  };
}

/* ---------- Trial / access ---------- */

export function trialDaysLeft(trialEndsAt?: string | null) {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function accessState(merchant?: Merchant | null) {
  if (!merchant) return "loading" as const;
  if (merchant.access_status === "active") return "active" as const;
  if (merchant.access_status === "suspended") return "suspended" as const;
  return trialDaysLeft(merchant.trial_ends_at) > 0 ? ("trial" as const) : ("expired" as const);
}

export function useUpdateMerchantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      access_status?: string;
      trial_ends_at?: string;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("merchants").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
}

export function useAddPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      employee_id: string | null;
      establishment_id: string | null;
      points: number;
      montant?: number;
    }) => {
      const { error } = await supabase.from("points_history").insert({
        customer_id: input.customer_id,
        employee_id: input.employee_id,
        establishment_id: input.establishment_id,
        points_ajoutes: input.points,
        montant: input.montant ?? 0,
        type: "passage",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

/* ---------- Reward mode helpers ---------- */

export function isAmountMode(card?: LoyaltyCard | null) {
  return card?.mode_recompense === "montant";
}

export function cardGoal(card?: LoyaltyCard | null) {
  if (!card) return 10;
  return isAmountMode(card)
    ? Number(card.montant_pour_recompense || 0)
    : card.nb_points_pour_recompense;
}

export function entryValue(card: LoyaltyCard | null | undefined, p: PointEntry) {
  return isAmountMode(card) ? Number(p.montant ?? 0) : p.points_ajoutes;
}

export function customerName(c: { nom: string | null; prenom?: string | null }) {
  return [c.prenom, c.nom].filter(Boolean).join(" ") || "Client";
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { customer_id: string; valeur: string }) => {
      const { error } = await supabase.from("rewards_redeemed").insert(input);
      if (error) throw error;
      const { error: e2 } = await supabase.from("points_history").insert({
        customer_id: input.customer_id,
        points_ajoutes: 0,
        type: "recompense",
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
}

/* ---------- Analytics helpers ---------- */

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function inRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
}

export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
