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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          requested_executive: boolean
          requested_team: Database["public"]["Enums"]["team_kind"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id?: string
          notes?: string | null
          requested_executive?: boolean
          requested_team: Database["public"]["Enums"]["team_kind"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          requested_executive?: boolean
          requested_team?: Database["public"]["Enums"]["team_kind"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          company_name: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          company_name?: string | null
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          company_name?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          vendor_name?: string | null
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          categories: string[]
          company_name: string | null
          conditions: string | null
          created_at: string
          created_by: string
          customer_name: string
          email: string | null
          follow_up_date: string | null
          id: string
          location: string
          phone: string
          remarks: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          categories?: string[]
          company_name?: string | null
          conditions?: string | null
          created_at?: string
          created_by: string
          customer_name: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          location: string
          phone: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          categories?: string[]
          company_name?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string
          phone?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_teams: {
        Row: {
          id: string
          team: Database["public"]["Enums"]["team_kind"]
          user_id: string
        }
        Insert: {
          id?: string
          team: Database["public"]["Enums"]["team_kind"]
          user_id: string
        }
        Update: {
          id?: string
          team?: Database["public"]["Enums"]["team_kind"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_records: {
        Row: {
          company_name: string | null
          conditions: string | null
          created_at: string
          created_by: string
          delivery_capacity: string | null
          email: string | null
          follow_up_date: string | null
          id: string
          location: string
          moq: string | null
          phone: string
          price_range: string | null
          product_categories: string[]
          status: Database["public"]["Enums"]["record_status"]
          supply_capacity: string | null
          updated_at: string
          vendor_name: string
          website: string | null
        }
        Insert: {
          company_name?: string | null
          conditions?: string | null
          created_at?: string
          created_by: string
          delivery_capacity?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          location: string
          moq?: string | null
          phone: string
          price_range?: string | null
          product_categories?: string[]
          status?: Database["public"]["Enums"]["record_status"]
          supply_capacity?: string | null
          updated_at?: string
          vendor_name: string
          website?: string | null
        }
        Update: {
          company_name?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string
          delivery_capacity?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string
          moq?: string | null
          phone?: string
          price_range?: string | null
          product_categories?: string[]
          status?: Database["public"]["Enums"]["record_status"]
          supply_capacity?: string | null
          updated_at?: string
          vendor_name?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member" | "executive_sales" | "executive_purchase"
      record_status: "accepted" | "follow_up" | "rejected"
      team_kind: "sales" | "purchase"
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
      app_role: ["admin", "member", "executive_sales", "executive_purchase"],
      record_status: ["accepted", "follow_up", "rejected"],
      team_kind: ["sales", "purchase"],
    },
  },
} as const
