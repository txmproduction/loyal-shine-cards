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
};

export type LoyaltyCard = {
  id: string;
  merchant_id: string;
  nb_points_pour_recompense: number;
  valeur_recompense: string;
  design: unknown;
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
};

export type Customer = {
  id: string;
  nom: string | null;
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
  type: string;
  date: string;
};

export function useMerchant() {
  return useQuery({
    queryKey: ["merchant"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, nom_commerce, email, telephone, adresse, logo_url, couleur_marque")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Merchant | null) ?? null;
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
        .select("id, nom, adresse")
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
          "id, nom, email, telephone, created_at, apple_wallet_pass_id, google_wallet_pass_id",
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
        .select("id, customer_id, employee_id, establishment_id, points_ajoutes, type, date")
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

export function useAddPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      employee_id: string | null;
      establishment_id: string | null;
      points: number;
    }) => {
      const { error } = await supabase.from("points_history").insert({
        customer_id: input.customer_id,
        employee_id: input.employee_id,
        establishment_id: input.establishment_id,
        points_ajoutes: input.points,
        type: "passage",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["points"] });
    },
  });
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
