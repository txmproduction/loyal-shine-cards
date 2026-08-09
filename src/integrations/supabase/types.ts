export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          apple_wallet_pass_id: string | null
          created_at: string
          email: string | null
          establishment_id: string | null
          google_wallet_pass_id: string | null
          id: string
          merchant_id: string
          nom: string | null
          prenom: string | null
          telephone: string | null
        }
        Insert: {
          apple_wallet_pass_id?: string | null
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          google_wallet_pass_id?: string | null
          id?: string
          merchant_id: string
          nom?: string | null
          prenom?: string | null
          telephone?: string | null
        }
        Update: {
          apple_wallet_pass_id?: string | null
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          google_wallet_pass_id?: string | null
          id?: string
          merchant_id?: string
          nom?: string | null
          prenom?: string | null
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          nom: string
          pin_code: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          nom: string
          pin_code: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          nom?: string
          pin_code?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          adresse: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          merchant_id: string
          nom: string
          public_code: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          merchant_id: string
          nom: string
          public_code?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          merchant_id?: string
          nom?: string
          public_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          created_at: string
          design: Json
          id: string
          merchant_id: string
          mode_recompense: string
          montant_pour_recompense: number
          nb_points_pour_recompense: number
          valeur_recompense: string
        }
        Insert: {
          created_at?: string
          design?: Json
          id?: string
          merchant_id: string
          mode_recompense?: string
          montant_pour_recompense?: number
          nb_points_pour_recompense?: number
          valeur_recompense?: string
        }
        Update: {
          created_at?: string
          design?: Json
          id?: string
          merchant_id?: string
          mode_recompense?: string
          montant_pour_recompense?: number
          nb_points_pour_recompense?: number
          valeur_recompense?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          access_status: string
          adresse: string | null
          couleur_marque: string | null
          created_at: string
          email: string
          id: string
          logo_url: string | null
          nom_commerce: string
          telephone: string | null
          trial_ends_at: string
          user_id: string | null
        }
        Insert: {
          access_status?: string
          adresse?: string | null
          couleur_marque?: string | null
          created_at?: string
          email: string
          id?: string
          logo_url?: string | null
          nom_commerce: string
          telephone?: string | null
          trial_ends_at?: string
          user_id?: string | null
        }
        Update: {
          access_status?: string
          adresse?: string | null
          couleur_marque?: string | null
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          nom_commerce?: string
          telephone?: string | null
          trial_ends_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      points_history: {
        Row: {
          customer_id: string
          date: string
          employee_id: string | null
          establishment_id: string | null
          id: string
          montant: number
          points_ajoutes: number
          type: string
        }
        Insert: {
          customer_id: string
          date?: string
          employee_id?: string | null
          establishment_id?: string | null
          id?: string
          montant?: number
          points_ajoutes?: number
          type?: string
        }
        Update: {
          customer_id?: string
          date?: string
          employee_id?: string | null
          establishment_id?: string | null
          id?: string
          montant?: number
          points_ajoutes?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_redeemed: {
        Row: {
          customer_id: string
          date: string
          id: string
          valeur: string | null
        }
        Insert: {
          customer_id: string
          date?: string
          id?: string
          valeur?: string | null
        }
        Update: {
          customer_id?: string
          date?: string
          id?: string
          valeur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_redeemed_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_demo_merchant: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      employee_merchant_id: { Args: never; Returns: string }
      get_public_establishment: {
        Args: { _code: string }
        Returns: {
          acces_actif: boolean
          couleur_marque: string
          establishment_id: string
          establishment_nom: string
          logo_url: string
          nom_commerce: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_customer: { Args: { _customer_id: string }; Returns: boolean }
      owns_merchant: { Args: { _merchant_id: string }; Returns: boolean }
      register_customer_public: {
        Args: {
          _code: string
          _nom: string
          _prenom: string
          _telephone: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "merchant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "merchant"],
    },
  },
} as const
