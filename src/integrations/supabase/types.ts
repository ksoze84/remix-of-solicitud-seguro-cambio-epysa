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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_executives: {
        Row: {
          bank_name: string
          contact_number: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bank_name: string
          contact_number: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bank_name?: string
          contact_number?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_requests: {
        Row: {
          banco: string | null
          bank_comparison_data: Json | null
          cliente: string
          created_at: string
          dias_forward: number | null
          estado: string
          fecha_vencimiento: string | null
          id: string
          monto_negocio_usd: number
          notas: string | null
          numero_sie: string | null
          numeros_internos: string[]
          payments: Json
          porcentaje_cobertura: number | null
          puntos_forwards: number | null
          rut: string
          tc_all_in: number | null
          tc_cliente: number | null
          tc_factura: number | null
          tc_referencial: number | null
          tc_spot: number | null
          total_factura_clp: number | null
          unidades: number
          updated_at: string
          user_id: string
          valor_factura_usd_neto: number | null
          valor_factura_usd_total: number | null
        }
        Insert: {
          banco?: string | null
          bank_comparison_data?: Json | null
          cliente: string
          created_at?: string
          dias_forward?: number | null
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          monto_negocio_usd: number
          notas?: string | null
          numero_sie?: string | null
          numeros_internos?: string[]
          payments?: Json
          porcentaje_cobertura?: number | null
          puntos_forwards?: number | null
          rut: string
          tc_all_in?: number | null
          tc_cliente?: number | null
          tc_factura?: number | null
          tc_referencial?: number | null
          tc_spot?: number | null
          total_factura_clp?: number | null
          unidades: number
          updated_at?: string
          user_id: string
          valor_factura_usd_neto?: number | null
          valor_factura_usd_total?: number | null
        }
        Update: {
          banco?: string | null
          bank_comparison_data?: Json | null
          cliente?: string
          created_at?: string
          dias_forward?: number | null
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          monto_negocio_usd?: number
          notas?: string | null
          numero_sie?: string | null
          numeros_internos?: string[]
          payments?: Json
          porcentaje_cobertura?: number | null
          puntos_forwards?: number | null
          rut?: string
          tc_all_in?: number | null
          tc_cliente?: number | null
          tc_factura?: number | null
          tc_referencial?: number | null
          tc_spot?: number | null
          total_factura_clp?: number | null
          unidades?: number
          updated_at?: string
          user_id?: string
          valor_factura_usd_neto?: number | null
          valor_factura_usd_total?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          correo_gerente: string | null
          correo_jefatura_directa: string | null
          created_at: string
          email: string
          id: string
          nombre_apellido: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          correo_gerente?: string | null
          correo_jefatura_directa?: string | null
          created_at?: string
          email: string
          id?: string
          nombre_apellido?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          correo_gerente?: string | null
          correo_jefatura_directa?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre_apellido?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_coordinador: { Args: never; Returns: boolean }
      is_vendedor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "ADMIN" | "COORDINADOR" | "VENDEDOR"
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
      app_role: ["ADMIN", "COORDINADOR", "VENDEDOR"],
    },
  },
} as const
