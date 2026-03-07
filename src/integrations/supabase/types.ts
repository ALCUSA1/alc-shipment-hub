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
      carrier_rates: {
        Row: {
          base_rate: number
          carrier: string
          container_type: string
          created_at: string
          currency: string
          destination_port: string
          id: string
          notes: string | null
          origin_port: string
          surcharges: Json
          transit_days: number | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          base_rate: number
          carrier: string
          container_type: string
          created_at?: string
          currency?: string
          destination_port: string
          id?: string
          notes?: string | null
          origin_port: string
          surcharges?: Json
          transit_days?: number | null
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          base_rate?: number
          carrier?: string
          container_type?: string
          created_at?: string
          currency?: string
          destination_port?: string
          id?: string
          notes?: string | null
          origin_port?: string
          surcharges?: Json
          transit_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          billing_address: string | null
          billing_email: string | null
          cargo_insurance_expiry: string | null
          cargo_insurance_policy: string | null
          cargo_insurance_provider: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          credit_limit: number | null
          credit_terms: string | null
          duns_number: string | null
          ein: string | null
          email: string | null
          fmc_license_expiry: string | null
          fmc_license_number: string | null
          fmc_license_status: string | null
          general_liability_expiry: string | null
          general_liability_policy: string | null
          general_liability_provider: string | null
          id: string
          industry: string | null
          notes: string | null
          oti_bond_amount: number | null
          oti_bond_number: string | null
          oti_bond_surety: string | null
          payment_terms_days: number | null
          phone: string | null
          sam_expiry: string | null
          sam_registration: string | null
          state: string | null
          status: Database["public"]["Enums"]["company_status"]
          trade_name: string | null
          updated_at: string
          user_id: string
          w9_on_file: boolean | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          billing_email?: string | null
          cargo_insurance_expiry?: string | null
          cargo_insurance_policy?: string | null
          cargo_insurance_provider?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: string | null
          duns_number?: string | null
          ein?: string | null
          email?: string | null
          fmc_license_expiry?: string | null
          fmc_license_number?: string | null
          fmc_license_status?: string | null
          general_liability_expiry?: string | null
          general_liability_policy?: string | null
          general_liability_provider?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          oti_bond_amount?: number | null
          oti_bond_number?: string | null
          oti_bond_surety?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          sam_expiry?: string | null
          sam_registration?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          trade_name?: string | null
          updated_at?: string
          user_id: string
          w9_on_file?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          billing_email?: string | null
          cargo_insurance_expiry?: string | null
          cargo_insurance_policy?: string | null
          cargo_insurance_provider?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: string | null
          duns_number?: string | null
          ein?: string | null
          email?: string | null
          fmc_license_expiry?: string | null
          fmc_license_number?: string | null
          fmc_license_status?: string | null
          general_liability_expiry?: string | null
          general_liability_policy?: string | null
          general_liability_provider?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          oti_bond_amount?: number | null
          oti_bond_number?: string | null
          oti_bond_surety?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          sam_expiry?: string | null
          sam_registration?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          w9_on_file?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      company_activities: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          role: string
          title: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          role?: string
          title?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          role?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_name: string
          doc_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_name: string
          doc_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_name?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      customs_filings: {
        Row: {
          aes_citation: string | null
          broker_email: string | null
          broker_name: string | null
          broker_ref: string | null
          carrier_name: string | null
          consignee_address: string | null
          consignee_name: string | null
          country_of_destination: string | null
          created_at: string
          export_date: string | null
          exporter_ein: string | null
          exporter_name: string | null
          filing_type: string
          hts_codes: Json | null
          id: string
          itn: string | null
          mode_of_transport: string | null
          notes: string | null
          port_of_export: string | null
          port_of_unlading: string | null
          shipment_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          aes_citation?: string | null
          broker_email?: string | null
          broker_name?: string | null
          broker_ref?: string | null
          carrier_name?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          country_of_destination?: string | null
          created_at?: string
          export_date?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          filing_type?: string
          hts_codes?: Json | null
          id?: string
          itn?: string | null
          mode_of_transport?: string | null
          notes?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          shipment_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          aes_citation?: string | null
          broker_email?: string | null
          broker_name?: string | null
          broker_ref?: string | null
          carrier_name?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          country_of_destination?: string | null
          created_at?: string
          export_date?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          filing_type?: string
          hts_codes?: Json | null
          id?: string
          itn?: string | null
          mode_of_transport?: string | null
          notes?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          shipment_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_filings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_milestones: {
        Row: {
          created_at: string
          event_date: string
          filing_id: string
          id: string
          milestone: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          filing_id: string
          id?: string
          milestone: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          filing_id?: string
          id?: string
          milestone?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_milestones_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "customs_filings"
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
      edi_messages: {
        Row: {
          carrier: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          message_ref: string | null
          message_type: string
          payload: Json
          processed_at: string | null
          shipment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          message_ref?: string | null
          message_type: string
          payload?: Json
          processed_at?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          message_ref?: string | null
          message_type?: string
          payload?: Json
          processed_at?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edi_messages_shipment_id_fkey"
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
          logo_url: string | null
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
          logo_url?: string | null
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
          logo_url?: string | null
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "ops_manager" | "sales" | "viewer"
      company_status:
        | "prospect"
        | "pending_compliance"
        | "active"
        | "suspended"
        | "inactive"
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
      app_role: ["admin", "ops_manager", "sales", "viewer"],
      company_status: [
        "prospect",
        "pending_compliance",
        "active",
        "suspended",
        "inactive",
      ],
    },
  },
} as const
