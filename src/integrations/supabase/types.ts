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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cargo: {
        Row: {
          commodity: string | null
          created_at: string
          gross_weight: number | null
          hs_code: string | null
          id: string
          num_packages: number | null
          package_type: string | null
          shipment_id: string
          volume: number | null
        }
        Insert: {
          commodity?: string | null
          created_at?: string
          gross_weight?: number | null
          hs_code?: string | null
          id?: string
          num_packages?: number | null
          package_type?: string | null
          shipment_id: string
          volume?: number | null
        }
        Update: {
          commodity?: string | null
          created_at?: string
          gross_weight?: number | null
          hs_code?: string | null
          id?: string
          num_packages?: number | null
          package_type?: string | null
          shipment_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      containers: {
        Row: {
          container_number: string | null
          container_type: string
          created_at: string
          id: string
          quantity: number
          seal_number: string | null
          shipment_id: string
        }
        Insert: {
          container_number?: string | null
          container_type: string
          created_at?: string
          id?: string
          quantity?: number
          seal_number?: string | null
          shipment_id: string
        }
        Update: {
          container_number?: string | null
          container_type?: string
          created_at?: string
          id?: string
          quantity?: number
          seal_number?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "containers_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string | null
          id: string
          shipment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url?: string | null
          id?: string
          shipment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string | null
          id?: string
          shipment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          quote_id: string | null
          shipment_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          quote_id?: string | null
          shipment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          quote_id?: string | null
          shipment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      ports: {
        Row: {
          code: string
          country: string
          id: string
          name: string
          type: string
        }
        Insert: {
          code: string
          country: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          code?: string
          country?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          shipment_id: string
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_parties: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          role: string
          shipment_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          role: string
          shipment_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          role?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_parties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          booking_ref: string | null
          created_at: string
          delivery_location: string | null
          destination_port: string | null
          eta: string | null
          etd: string | null
          id: string
          origin_port: string | null
          pickup_location: string | null
          shipment_ref: string
          shipment_type: string
          status: string
          updated_at: string
          user_id: string
          vessel: string | null
          voyage: string | null
        }
        Insert: {
          booking_ref?: string | null
          created_at?: string
          delivery_location?: string | null
          destination_port?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          origin_port?: string | null
          pickup_location?: string | null
          shipment_ref: string
          shipment_type?: string
          status?: string
          updated_at?: string
          user_id: string
          vessel?: string | null
          voyage?: string | null
        }
        Update: {
          booking_ref?: string | null
          created_at?: string
          delivery_location?: string | null
          destination_port?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          origin_port?: string | null
          pickup_location?: string | null
          shipment_ref?: string
          shipment_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          vessel?: string | null
          voyage?: string | null
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          event_date: string
          id: string
          location: string | null
          milestone: string
          notes: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          id?: string
          location?: string | null
          milestone: string
          notes?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          location?: string | null
          milestone?: string
          notes?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_pickups: {
        Row: {
          cargo_description: string | null
          container_type: string | null
          created_at: string
          delivery_location: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          notes: string | null
          pickup_date: string | null
          pickup_location: string | null
          pickup_time: string | null
          shipment_id: string
          status: string
          truck_plate: string | null
          updated_at: string
        }
        Insert: {
          cargo_description?: string | null
          container_type?: string | null
          created_at?: string
          delivery_location?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          shipment_id: string
          status?: string
          truck_plate?: string | null
          updated_at?: string
        }
        Update: {
          cargo_description?: string | null
          container_type?: string | null
          created_at?: string
          delivery_location?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          shipment_id?: string
          status?: string
          truck_plate?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_pickups_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_operations: {
        Row: {
          cargo_description: string | null
          created_at: string
          id: string
          notes: string | null
          num_packages: number | null
          operation_type: string
          release_authorization: string | null
          shipment_id: string
          status: string
          storage_instructions: string | null
          updated_at: string
          volume: number | null
          warehouse_location: string | null
          warehouse_name: string | null
          weight: number | null
        }
        Insert: {
          cargo_description?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          num_packages?: number | null
          operation_type?: string
          release_authorization?: string | null
          shipment_id: string
          status?: string
          storage_instructions?: string | null
          updated_at?: string
          volume?: number | null
          warehouse_location?: string | null
          warehouse_name?: string | null
          weight?: number | null
        }
        Update: {
          cargo_description?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          num_packages?: number | null
          operation_type?: string
          release_authorization?: string | null
          shipment_id?: string
          status?: string
          storage_instructions?: string | null
          updated_at?: string
          volume?: number | null
          warehouse_location?: string | null
          warehouse_name?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_operations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
