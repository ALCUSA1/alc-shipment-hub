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
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_id: string | null
          source_table: string | null
          title: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title?: string
        }
        Relationships: []
      }
      aes_commodity_lines: {
        Row: {
          aes_filing_id: string
          commodity_description: string | null
          country_of_origin: string | null
          created_at: string
          df_indicator: string | null
          eccn: string | null
          export_info_code: string | null
          hts_number: string | null
          id: string
          license_code: string | null
          license_number: string | null
          line_sequence: number
          no_license_required: boolean | null
          number_of_pieces: number | null
          quantity: number | null
          schedule_b_number: string | null
          shipping_weight_kg: number | null
          tariff_code: string | null
          unit_of_measure: string | null
          updated_at: string
          value_usd: number | null
          vehicle_title_number: string | null
          vin_product_number: string | null
        }
        Insert: {
          aes_filing_id: string
          commodity_description?: string | null
          country_of_origin?: string | null
          created_at?: string
          df_indicator?: string | null
          eccn?: string | null
          export_info_code?: string | null
          hts_number?: string | null
          id?: string
          license_code?: string | null
          license_number?: string | null
          line_sequence?: number
          no_license_required?: boolean | null
          number_of_pieces?: number | null
          quantity?: number | null
          schedule_b_number?: string | null
          shipping_weight_kg?: number | null
          tariff_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          value_usd?: number | null
          vehicle_title_number?: string | null
          vin_product_number?: string | null
        }
        Update: {
          aes_filing_id?: string
          commodity_description?: string | null
          country_of_origin?: string | null
          created_at?: string
          df_indicator?: string | null
          eccn?: string | null
          export_info_code?: string | null
          hts_number?: string | null
          id?: string
          license_code?: string | null
          license_number?: string | null
          line_sequence?: number
          no_license_required?: boolean | null
          number_of_pieces?: number | null
          quantity?: number | null
          schedule_b_number?: string | null
          shipping_weight_kg?: number | null
          tariff_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          value_usd?: number | null
          vehicle_title_number?: string | null
          vin_product_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aes_commodity_lines_aes_filing_id_fkey"
            columns: ["aes_filing_id"]
            isOneToOne: false
            referencedRelation: "aes_filings"
            referencedColumns: ["id"]
          },
        ]
      }
      aes_filings: {
        Row: {
          authorized_agent_address: string | null
          authorized_agent_ein: string | null
          authorized_agent_name: string | null
          carrier_identification_code: string | null
          compliance_alerts: string[] | null
          containerized: boolean | null
          country_of_manufacture: string | null
          country_of_ultimate_destination: string | null
          created_at: string
          date_of_exportation: string | null
          eei_exemption_citation: string | null
          eei_required: boolean | null
          entry_number: string | null
          equipment_numbers: string[] | null
          exporting_carrier: string | null
          filing_option: string | null
          filing_status: string
          forwarder_authorization_language: string | null
          hazardous_materials: boolean | null
          id: string
          in_bond_code: string | null
          inability_to_deliver: string | null
          intermediate_consignee_address: string | null
          intermediate_consignee_name: string | null
          itn: string | null
          itn_created_date: string | null
          itn_last_updated_date: string | null
          loading_pier: string | null
          method_of_transportation: string | null
          original_itn: string | null
          port_of_export: string | null
          port_of_unlading: string | null
          related_parties: boolean | null
          routed_export_transaction: boolean | null
          seal_numbers: string[] | null
          shipment_id: string
          shipment_reference_number: string | null
          shipper_certification_language: string | null
          special_instructions: string | null
          state_of_origin: string | null
          title_of_shipper_representative: string | null
          transportation_ref_number: string | null
          ultimate_consignee_address: string | null
          ultimate_consignee_name: string | null
          ultimate_consignee_type: string | null
          updated_at: string
          user_id: string
          usppi_address: string | null
          usppi_contact_name: string | null
          usppi_ein: string | null
          usppi_email: string | null
          usppi_name: string | null
          usppi_phone: string | null
          xtn: string | null
        }
        Insert: {
          authorized_agent_address?: string | null
          authorized_agent_ein?: string | null
          authorized_agent_name?: string | null
          carrier_identification_code?: string | null
          compliance_alerts?: string[] | null
          containerized?: boolean | null
          country_of_manufacture?: string | null
          country_of_ultimate_destination?: string | null
          created_at?: string
          date_of_exportation?: string | null
          eei_exemption_citation?: string | null
          eei_required?: boolean | null
          entry_number?: string | null
          equipment_numbers?: string[] | null
          exporting_carrier?: string | null
          filing_option?: string | null
          filing_status?: string
          forwarder_authorization_language?: string | null
          hazardous_materials?: boolean | null
          id?: string
          in_bond_code?: string | null
          inability_to_deliver?: string | null
          intermediate_consignee_address?: string | null
          intermediate_consignee_name?: string | null
          itn?: string | null
          itn_created_date?: string | null
          itn_last_updated_date?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          original_itn?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          seal_numbers?: string[] | null
          shipment_id: string
          shipment_reference_number?: string | null
          shipper_certification_language?: string | null
          special_instructions?: string | null
          state_of_origin?: string | null
          title_of_shipper_representative?: string | null
          transportation_ref_number?: string | null
          ultimate_consignee_address?: string | null
          ultimate_consignee_name?: string | null
          ultimate_consignee_type?: string | null
          updated_at?: string
          user_id: string
          usppi_address?: string | null
          usppi_contact_name?: string | null
          usppi_ein?: string | null
          usppi_email?: string | null
          usppi_name?: string | null
          usppi_phone?: string | null
          xtn?: string | null
        }
        Update: {
          authorized_agent_address?: string | null
          authorized_agent_ein?: string | null
          authorized_agent_name?: string | null
          carrier_identification_code?: string | null
          compliance_alerts?: string[] | null
          containerized?: boolean | null
          country_of_manufacture?: string | null
          country_of_ultimate_destination?: string | null
          created_at?: string
          date_of_exportation?: string | null
          eei_exemption_citation?: string | null
          eei_required?: boolean | null
          entry_number?: string | null
          equipment_numbers?: string[] | null
          exporting_carrier?: string | null
          filing_option?: string | null
          filing_status?: string
          forwarder_authorization_language?: string | null
          hazardous_materials?: boolean | null
          id?: string
          in_bond_code?: string | null
          inability_to_deliver?: string | null
          intermediate_consignee_address?: string | null
          intermediate_consignee_name?: string | null
          itn?: string | null
          itn_created_date?: string | null
          itn_last_updated_date?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          original_itn?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          seal_numbers?: string[] | null
          shipment_id?: string
          shipment_reference_number?: string | null
          shipper_certification_language?: string | null
          special_instructions?: string | null
          state_of_origin?: string | null
          title_of_shipper_representative?: string | null
          transportation_ref_number?: string | null
          ultimate_consignee_address?: string | null
          ultimate_consignee_name?: string | null
          ultimate_consignee_type?: string | null
          updated_at?: string
          user_id?: string
          usppi_address?: string | null
          usppi_contact_name?: string | null
          usppi_ein?: string | null
          usppi_email?: string | null
          usppi_name?: string | null
          usppi_phone?: string | null
          xtn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aes_filings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      booking_legs: {
        Row: {
          booking_id: string
          created_at: string
          destination_port: string | null
          eta: string | null
          etd: string | null
          id: string
          leg_order: number
          leg_type: string
          notes: string | null
          origin_port: string | null
          transshipment_port: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          destination_port?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          leg_order?: number
          leg_type?: string
          notes?: string | null
          origin_port?: string | null
          transshipment_port?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          destination_port?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          leg_order?: number
          leg_type?: string
          notes?: string | null
          origin_port?: string | null
          transshipment_port?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_legs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "vessel_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo: {
        Row: {
          chargeable_weight: number | null
          commodity: string | null
          country_of_origin: string | null
          created_at: string
          dangerous_goods: boolean
          dimensions: string | null
          gross_weight: number | null
          hs_code: string | null
          hts_code: string | null
          id: string
          marks_and_numbers: string | null
          net_weight: number | null
          num_packages: number | null
          package_type: string | null
          pieces: number | null
          rate_class: string | null
          schedule_b: string | null
          shipment_id: string
          special_instructions: string | null
          total_value: number | null
          unit_value: number | null
          volume: number | null
        }
        Insert: {
          chargeable_weight?: number | null
          commodity?: string | null
          country_of_origin?: string | null
          created_at?: string
          dangerous_goods?: boolean
          dimensions?: string | null
          gross_weight?: number | null
          hs_code?: string | null
          hts_code?: string | null
          id?: string
          marks_and_numbers?: string | null
          net_weight?: number | null
          num_packages?: number | null
          package_type?: string | null
          pieces?: number | null
          rate_class?: string | null
          schedule_b?: string | null
          shipment_id: string
          special_instructions?: string | null
          total_value?: number | null
          unit_value?: number | null
          volume?: number | null
        }
        Update: {
          chargeable_weight?: number | null
          commodity?: string | null
          country_of_origin?: string | null
          created_at?: string
          dangerous_goods?: boolean
          dimensions?: string | null
          gross_weight?: number | null
          hs_code?: string | null
          hts_code?: string | null
          id?: string
          marks_and_numbers?: string | null
          net_weight?: number | null
          num_packages?: number | null
          package_type?: string | null
          pieces?: number | null
          rate_class?: string | null
          schedule_b?: string | null
          shipment_id?: string
          special_instructions?: string | null
          total_value?: number | null
          unit_value?: number | null
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
      carrier_payment_profiles: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          carrier_name: string
          created_at: string
          iban: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_method: string
          routing_number: string | null
          stripe_account_id: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          carrier_name: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_method?: string
          routing_number?: string | null
          stripe_account_id?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          carrier_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_method?: string
          routing_number?: string | null
          stripe_account_id?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
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
          mode: string
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
          mode?: string
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
          mode?: string
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
          chassis_capable: boolean | null
          city: string | null
          company_name: string
          company_type: string
          country: string | null
          created_at: string
          credit_limit: number | null
          credit_terms: string | null
          dispatcher_name: string | null
          dispatcher_phone: string | null
          duns_number: string | null
          ein: string | null
          email: string | null
          fmc_license_expiry: string | null
          fmc_license_number: string | null
          fmc_license_status: string | null
          general_liability_expiry: string | null
          general_liability_policy: string | null
          general_liability_provider: string | null
          hazmat_capable: boolean | null
          id: string
          industry: string | null
          internal_rating: number | null
          notes: string | null
          oti_bond_amount: number | null
          oti_bond_number: string | null
          oti_bond_surety: string | null
          payment_terms_days: number | null
          phone: string | null
          port_coverage: string[] | null
          preferred_partner: boolean | null
          reefer_capable: boolean | null
          sam_expiry: string | null
          sam_registration: string | null
          service_area: string | null
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
          chassis_capable?: boolean | null
          city?: string | null
          company_name: string
          company_type?: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: string | null
          dispatcher_name?: string | null
          dispatcher_phone?: string | null
          duns_number?: string | null
          ein?: string | null
          email?: string | null
          fmc_license_expiry?: string | null
          fmc_license_number?: string | null
          fmc_license_status?: string | null
          general_liability_expiry?: string | null
          general_liability_policy?: string | null
          general_liability_provider?: string | null
          hazmat_capable?: boolean | null
          id?: string
          industry?: string | null
          internal_rating?: number | null
          notes?: string | null
          oti_bond_amount?: number | null
          oti_bond_number?: string | null
          oti_bond_surety?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          port_coverage?: string[] | null
          preferred_partner?: boolean | null
          reefer_capable?: boolean | null
          sam_expiry?: string | null
          sam_registration?: string | null
          service_area?: string | null
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
          chassis_capable?: boolean | null
          city?: string | null
          company_name?: string
          company_type?: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: string | null
          dispatcher_name?: string | null
          dispatcher_phone?: string | null
          duns_number?: string | null
          ein?: string | null
          email?: string | null
          fmc_license_expiry?: string | null
          fmc_license_number?: string | null
          fmc_license_status?: string | null
          general_liability_expiry?: string | null
          general_liability_policy?: string | null
          general_liability_provider?: string | null
          hazmat_capable?: boolean | null
          id?: string
          industry?: string | null
          internal_rating?: number | null
          notes?: string | null
          oti_bond_amount?: number | null
          oti_bond_number?: string | null
          oti_bond_surety?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          port_coverage?: string[] | null
          preferred_partner?: boolean | null
          reefer_capable?: boolean | null
          sam_expiry?: string | null
          sam_registration?: string | null
          service_area?: string | null
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
          {
            foreignKeyName: "company_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
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
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
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
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      container_commodities: {
        Row: {
          commodity_description: string | null
          container_id: string
          country_of_manufacture: string | null
          created_at: string
          df_indicator: string | null
          eccn: string | null
          export_info_code: string | null
          gross_weight_kg: number | null
          hazardous: boolean
          hs_code: string | null
          hts_code: string | null
          id: string
          license_code: string | null
          license_number: string | null
          line_sequence: number
          net_weight_kg: number | null
          quantity: number | null
          schedule_b_number: string | null
          shipment_id: string
          unit_of_measure: string | null
          updated_at: string
          value_usd: number | null
          vin_product_number: string | null
        }
        Insert: {
          commodity_description?: string | null
          container_id: string
          country_of_manufacture?: string | null
          created_at?: string
          df_indicator?: string | null
          eccn?: string | null
          export_info_code?: string | null
          gross_weight_kg?: number | null
          hazardous?: boolean
          hs_code?: string | null
          hts_code?: string | null
          id?: string
          license_code?: string | null
          license_number?: string | null
          line_sequence?: number
          net_weight_kg?: number | null
          quantity?: number | null
          schedule_b_number?: string | null
          shipment_id: string
          unit_of_measure?: string | null
          updated_at?: string
          value_usd?: number | null
          vin_product_number?: string | null
        }
        Update: {
          commodity_description?: string | null
          container_id?: string
          country_of_manufacture?: string | null
          created_at?: string
          df_indicator?: string | null
          eccn?: string | null
          export_info_code?: string | null
          gross_weight_kg?: number | null
          hazardous?: boolean
          hs_code?: string | null
          hts_code?: string | null
          id?: string
          license_code?: string | null
          license_number?: string | null
          line_sequence?: number
          net_weight_kg?: number | null
          quantity?: number | null
          schedule_b_number?: string | null
          shipment_id?: string
          unit_of_measure?: string | null
          updated_at?: string
          value_usd?: number | null
          vin_product_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_commodities_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_commodities_shipment_id_fkey"
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
          container_size: string | null
          container_type: string
          created_at: string
          id: string
          oog_dimensions: string | null
          quantity: number
          reefer_temp: string | null
          seal_number: string | null
          shipment_id: string
          vgm: number | null
        }
        Insert: {
          container_number?: string | null
          container_size?: string | null
          container_type: string
          created_at?: string
          id?: string
          oog_dimensions?: string | null
          quantity?: number
          reefer_temp?: string | null
          seal_number?: string | null
          shipment_id: string
          vgm?: number | null
        }
        Update: {
          container_number?: string | null
          container_size?: string | null
          container_type?: string
          created_at?: string
          id?: string
          oog_dimensions?: string | null
          quantity?: number
          reefer_temp?: string | null
          seal_number?: string | null
          shipment_id?: string
          vgm?: number | null
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
      conversation_participants: {
        Row: {
          company_name: string | null
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          company_name?: string | null
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string | null
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          scope: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          scope?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          scope?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      demurrage_charges: {
        Row: {
          carrier: string | null
          charge_type: string
          container_number: string | null
          created_at: string
          currency: string
          daily_rate: number
          end_date: string | null
          free_days: number | null
          id: string
          notes: string | null
          shipment_id: string
          start_date: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          charge_type?: string
          container_number?: string | null
          created_at?: string
          currency?: string
          daily_rate?: number
          end_date?: string | null
          free_days?: number | null
          id?: string
          notes?: string | null
          shipment_id: string
          start_date?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          charge_type?: string
          container_number?: string | null
          created_at?: string
          currency?: string
          daily_rate?: number
          end_date?: string | null
          free_days?: number | null
          id?: string
          notes?: string | null
          shipment_id?: string
          start_date?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demurrage_charges_shipment_id_fkey"
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
      driver_assignments: {
        Row: {
          assigned_by: string
          container_numbers: string[] | null
          created_at: string
          delivery_address: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          driver_name: string | null
          driver_phone: string | null
          driver_user_id: string
          id: string
          instructions: string | null
          pickup_address: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          shipment_id: string
          status: string
          status_updated_at: string | null
          truck_plate: string | null
          trucking_quote_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          container_numbers?: string[] | null
          created_at?: string
          delivery_address?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id: string
          id?: string
          instructions?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          shipment_id: string
          status?: string
          status_updated_at?: string | null
          truck_plate?: string | null
          trucking_quote_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          container_numbers?: string[] | null
          created_at?: string
          delivery_address?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string
          id?: string
          instructions?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          shipment_id?: string
          status?: string
          status_updated_at?: string | null
          truck_plate?: string | null
          trucking_quote_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_trucking_quote_id_fkey"
            columns: ["trucking_quote_id"]
            isOneToOne: false
            referencedRelation: "trucking_quotes"
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
      email_campaigns: {
        Row: {
          body: string | null
          click_count: number
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          name: string
          open_count: number
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string | null
          tags: string[] | null
          target_count: number
          target_segment: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          click_count?: number
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          name: string
          open_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          tags?: string[] | null
          target_count?: number
          target_segment?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          click_count?: number
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          name?: string
          open_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          tags?: string[] | null
          target_count?: number
          target_segment?: string
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          effective_date: string
          id: string
          rate: number
          source: string
          target_currency: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          effective_date?: string
          id?: string
          rate: number
          source?: string
          target_currency: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          effective_date?: string
          id?: string
          rate?: number
          source?: string
          target_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          converted_at: string | null
          converted_company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          metadata: Json | null
          notes: string | null
          phone: string | null
          score: number
          source: string
          stage: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_company_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_name: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_name?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          demurrage_alerts: boolean
          id: string
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          rate_alerts: boolean
          shipment_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demurrage_alerts?: boolean
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          rate_alerts?: boolean
          shipment_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demurrage_alerts?: boolean
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          rate_alerts?: boolean
          shipment_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          carrier_amount: number | null
          carrier_name: string | null
          carrier_settlement_status: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          platform_fee: number | null
          quote_id: string | null
          shipment_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          carrier_amount?: number | null
          carrier_name?: string | null
          carrier_settlement_status?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          platform_fee?: number | null
          quote_id?: string | null
          shipment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          carrier_amount?: number | null
          carrier_name?: string | null
          carrier_settlement_status?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          platform_fee?: number | null
          quote_id?: string | null
          shipment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
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
      platform_settings: {
        Row: {
          created_at: string
          id: string
          platform_fee_type: string
          platform_fee_value: number
          stripe_connect_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_fee_type?: string
          platform_fee_value?: number
          stripe_connect_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_fee_type?: string
          platform_fee_value?: number
          stripe_connect_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
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
      promotional_materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          download_count: number
          file_type: string
          file_url: string | null
          id: string
          is_active: boolean
          name: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number
          file_type?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number
          file_type?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount: number | null
          approval_token: string | null
          approved_at: string | null
          carrier: string | null
          carrier_cost: number | null
          carrier_rate_id: string | null
          company_id: string | null
          container_type: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_price: number | null
          destination_port: string | null
          id: string
          margin_type: string | null
          margin_value: number | null
          notes: string | null
          origin_port: string | null
          payment_status: string
          shipment_id: string
          status: string
          transit_days: number | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          approval_token?: string | null
          approved_at?: string | null
          carrier?: string | null
          carrier_cost?: number | null
          carrier_rate_id?: string | null
          company_id?: string | null
          container_type?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_price?: number | null
          destination_port?: string | null
          id?: string
          margin_type?: string | null
          margin_value?: number | null
          notes?: string | null
          origin_port?: string | null
          payment_status?: string
          shipment_id: string
          status?: string
          transit_days?: number | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          approval_token?: string | null
          approved_at?: string | null
          carrier?: string | null
          carrier_cost?: number | null
          carrier_rate_id?: string | null
          company_id?: string | null
          container_type?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_price?: number | null
          destination_port?: string | null
          id?: string
          margin_type?: string | null
          margin_value?: number | null
          notes?: string | null
          origin_port?: string | null
          payment_status?: string
          shipment_id?: string
          status?: string
          transit_days?: number | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_carrier_rate_id_fkey"
            columns: ["carrier_rate_id"]
            isOneToOne: false
            referencedRelation: "carrier_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_alerts: {
        Row: {
          carrier: string | null
          container_type: string
          created_at: string
          destination_port: string
          id: string
          is_active: boolean
          origin_port: string
          threshold_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier?: string | null
          container_type: string
          created_at?: string
          destination_port: string
          id?: string
          is_active?: boolean
          origin_port: string
          threshold_rate: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string | null
          container_type?: string
          created_at?: string
          destination_port?: string
          id?: string
          is_active?: boolean
          origin_port?: string
          threshold_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipment_amendments: {
        Row: {
          amendment_type: string
          approved_at: string | null
          approved_by: string | null
          carrier_fee_amount: number | null
          carrier_fee_currency: string | null
          carrier_fee_required: boolean | null
          created_at: string
          description: string
          id: string
          notes: string | null
          payment_required_before_change: boolean | null
          payment_status: string | null
          shipment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amendment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          carrier_fee_amount?: number | null
          carrier_fee_currency?: string | null
          carrier_fee_required?: boolean | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          payment_required_before_change?: boolean | null
          payment_status?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amendment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          carrier_fee_amount?: number | null
          carrier_fee_currency?: string | null
          carrier_fee_required?: boolean | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          payment_required_before_change?: boolean | null
          payment_status?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_amendments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_charges: {
        Row: {
          amount: number
          charge_type: string
          created_at: string
          currency: string
          description: string
          id: string
          notes: string | null
          payment_id: string | null
          payment_status: string
          shipment_id: string
          who_pays: string | null
        }
        Insert: {
          amount?: number
          charge_type?: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          shipment_id: string
          who_pays?: string | null
        }
        Update: {
          amount?: number
          charge_type?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          shipment_id?: string
          who_pays?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_charges_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_cutoffs: {
        Row: {
          created_at: string
          cutoff_datetime: string | null
          cutoff_type: string
          id: string
          is_estimated: boolean
          notes: string | null
          set_by: string | null
          shipment_id: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutoff_datetime?: string | null
          cutoff_type: string
          id?: string
          is_estimated?: boolean
          notes?: string | null
          set_by?: string | null
          shipment_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutoff_datetime?: string | null
          cutoff_type?: string
          id?: string
          is_estimated?: boolean
          notes?: string | null
          set_by?: string | null
          shipment_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_cutoffs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_financials: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          date: string | null
          description: string
          entry_type: string
          id: string
          invoice_ref: string | null
          notes: string | null
          shipment_id: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          date?: string | null
          description: string
          entry_type?: string
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          shipment_id: string
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          date?: string | null
          description?: string
          entry_type?: string
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          shipment_id?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_financials_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_milestones: {
        Row: {
          completed_by: string | null
          created_at: string
          event_date: string | null
          id: string
          is_completed: boolean
          milestone_key: string
          milestone_label: string
          milestone_order: number
          notes: string | null
          shipment_id: string
          updated_at: string
        }
        Insert: {
          completed_by?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          is_completed?: boolean
          milestone_key: string
          milestone_label: string
          milestone_order: number
          notes?: string | null
          shipment_id: string
          updated_at?: string
        }
        Update: {
          completed_by?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          is_completed?: boolean
          milestone_key?: string
          milestone_label?: string
          milestone_order?: number
          notes?: string | null
          shipment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_milestones_shipment_id_fkey"
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
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          postal_code: string | null
          role: string
          shipment_id: string
          state: string | null
          tax_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          role: string
          shipment_id: string
          state?: string | null
          tax_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          role?: string
          shipment_id?: string
          state?: string | null
          tax_id?: string | null
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
      shipment_pnl_audit_log: {
        Row: {
          after_value: string | null
          before_value: string | null
          edited_at: string
          edited_by: string
          field_name: string
          financial_id: string
          id: string
          notes: string | null
          shipment_id: string
        }
        Insert: {
          after_value?: string | null
          before_value?: string | null
          edited_at?: string
          edited_by: string
          field_name: string
          financial_id: string
          id?: string
          notes?: string | null
          shipment_id: string
        }
        Update: {
          after_value?: string | null
          before_value?: string | null
          edited_at?: string
          edited_by?: string
          field_name?: string
          financial_id?: string
          id?: string
          notes?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_pnl_audit_log_financial_id_fkey"
            columns: ["financial_id"]
            isOneToOne: false
            referencedRelation: "shipment_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_pnl_audit_log_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_rates: {
        Row: {
          carrier: string | null
          container_count: number
          container_type: string | null
          contract_number: string | null
          created_at: string
          currency: string
          id: string
          is_selected: boolean
          markup_amount: number | null
          markup_percent: number | null
          notes: string | null
          rate_basis_type: string
          rate_per_container: number
          shipment_id: string
          surcharges: Json | null
          total_freight: number
          transit_days: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          carrier?: string | null
          container_count?: number
          container_type?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_selected?: boolean
          markup_amount?: number | null
          markup_percent?: number | null
          notes?: string | null
          rate_basis_type?: string
          rate_per_container?: number
          shipment_id: string
          surcharges?: Json | null
          total_freight?: number
          transit_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          carrier?: string | null
          container_count?: number
          container_type?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_selected?: boolean
          markup_amount?: number | null
          markup_percent?: number | null
          notes?: string | null
          rate_basis_type?: string
          rate_per_container?: number
          shipment_id?: string
          surcharges?: Json | null
          total_freight?: number
          transit_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_rates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          accounting_information: string | null
          aircraft_type: string | null
          airline: string | null
          airport_of_departure: string | null
          airport_of_destination: string | null
          booking_ref: string | null
          booking_terms: string | null
          cargo_arrival_date: string | null
          carrier: string | null
          carrier_submission_mode: string | null
          carrier_submission_status: string | null
          chargeable_weight: number | null
          commodity_item_number: string | null
          company_id: string | null
          converted_from_quote_id: string | null
          created_at: string
          customer_reference: string | null
          cy_cutoff: string | null
          declared_value: number | null
          declared_value_for_carriage: number | null
          declared_value_for_customs: number | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_instructions: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_location: string | null
          delivery_postal_code: string | null
          delivery_state: string | null
          delivery_validated: boolean | null
          destination_port: string | null
          destuffing_required: boolean | null
          doc_cutoff: string | null
          eta: string | null
          etd: string | null
          feeder_vessel: string | null
          feeder_voyage: string | null
          final_destination: string | null
          flight_number: string | null
          freight_terms: string | null
          handling_information: string | null
          handling_notes: string | null
          hawb_number: string | null
          iata_code_destination: string | null
          iata_code_origin: string | null
          id: string
          incoterms: string | null
          insurance_value: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          mawb_number: string | null
          mode: string
          nature_and_quantity: string | null
          origin_port: string | null
          payment_terms: string | null
          pickup_city: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_country: string | null
          pickup_instructions: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string | null
          pickup_postal_code: string | null
          pickup_state: string | null
          pickup_validated: boolean | null
          place_of_delivery: string | null
          place_of_receipt: string | null
          quote_reference: string | null
          rate_class: string | null
          requested_ship_date: string | null
          routing_and_destination: string | null
          sci: string | null
          shipment_ref: string
          shipment_type: string
          si_cutoff: string | null
          status: string
          storage_notes: string | null
          total_shipment_value: number | null
          transshipment_port_1: string | null
          transshipment_port_2: string | null
          updated_at: string
          user_id: string
          vessel: string | null
          vgm_cutoff: string | null
          voyage: string | null
          warehouse_location: string | null
          warehouse_receipt_number: string | null
        }
        Insert: {
          accounting_information?: string | null
          aircraft_type?: string | null
          airline?: string | null
          airport_of_departure?: string | null
          airport_of_destination?: string | null
          booking_ref?: string | null
          booking_terms?: string | null
          cargo_arrival_date?: string | null
          carrier?: string | null
          carrier_submission_mode?: string | null
          carrier_submission_status?: string | null
          chargeable_weight?: number | null
          commodity_item_number?: string | null
          company_id?: string | null
          converted_from_quote_id?: string | null
          created_at?: string
          customer_reference?: string | null
          cy_cutoff?: string | null
          declared_value?: number | null
          declared_value_for_carriage?: number | null
          declared_value_for_customs?: number | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_instructions?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_location?: string | null
          delivery_postal_code?: string | null
          delivery_state?: string | null
          delivery_validated?: boolean | null
          destination_port?: string | null
          destuffing_required?: boolean | null
          doc_cutoff?: string | null
          eta?: string | null
          etd?: string | null
          feeder_vessel?: string | null
          feeder_voyage?: string | null
          final_destination?: string | null
          flight_number?: string | null
          freight_terms?: string | null
          handling_information?: string | null
          handling_notes?: string | null
          hawb_number?: string | null
          iata_code_destination?: string | null
          iata_code_origin?: string | null
          id?: string
          incoterms?: string | null
          insurance_value?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          mawb_number?: string | null
          mode?: string
          nature_and_quantity?: string | null
          origin_port?: string | null
          payment_terms?: string | null
          pickup_city?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_country?: string | null
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          pickup_postal_code?: string | null
          pickup_state?: string | null
          pickup_validated?: boolean | null
          place_of_delivery?: string | null
          place_of_receipt?: string | null
          quote_reference?: string | null
          rate_class?: string | null
          requested_ship_date?: string | null
          routing_and_destination?: string | null
          sci?: string | null
          shipment_ref: string
          shipment_type?: string
          si_cutoff?: string | null
          status?: string
          storage_notes?: string | null
          total_shipment_value?: number | null
          transshipment_port_1?: string | null
          transshipment_port_2?: string | null
          updated_at?: string
          user_id: string
          vessel?: string | null
          vgm_cutoff?: string | null
          voyage?: string | null
          warehouse_location?: string | null
          warehouse_receipt_number?: string | null
        }
        Update: {
          accounting_information?: string | null
          aircraft_type?: string | null
          airline?: string | null
          airport_of_departure?: string | null
          airport_of_destination?: string | null
          booking_ref?: string | null
          booking_terms?: string | null
          cargo_arrival_date?: string | null
          carrier?: string | null
          carrier_submission_mode?: string | null
          carrier_submission_status?: string | null
          chargeable_weight?: number | null
          commodity_item_number?: string | null
          company_id?: string | null
          converted_from_quote_id?: string | null
          created_at?: string
          customer_reference?: string | null
          cy_cutoff?: string | null
          declared_value?: number | null
          declared_value_for_carriage?: number | null
          declared_value_for_customs?: number | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_instructions?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_location?: string | null
          delivery_postal_code?: string | null
          delivery_state?: string | null
          delivery_validated?: boolean | null
          destination_port?: string | null
          destuffing_required?: boolean | null
          doc_cutoff?: string | null
          eta?: string | null
          etd?: string | null
          feeder_vessel?: string | null
          feeder_voyage?: string | null
          final_destination?: string | null
          flight_number?: string | null
          freight_terms?: string | null
          handling_information?: string | null
          handling_notes?: string | null
          hawb_number?: string | null
          iata_code_destination?: string | null
          iata_code_origin?: string | null
          id?: string
          incoterms?: string | null
          insurance_value?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          mawb_number?: string | null
          mode?: string
          nature_and_quantity?: string | null
          origin_port?: string | null
          payment_terms?: string | null
          pickup_city?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_country?: string | null
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          pickup_postal_code?: string | null
          pickup_state?: string | null
          pickup_validated?: boolean | null
          place_of_delivery?: string | null
          place_of_receipt?: string | null
          quote_reference?: string | null
          rate_class?: string | null
          requested_ship_date?: string | null
          routing_and_destination?: string | null
          sci?: string | null
          shipment_ref?: string
          shipment_type?: string
          si_cutoff?: string | null
          status?: string
          storage_notes?: string | null
          total_shipment_value?: number | null
          transshipment_port_1?: string | null
          transshipment_port_2?: string | null
          updated_at?: string
          user_id?: string
          vessel?: string | null
          vgm_cutoff?: string | null
          voyage?: string | null
          warehouse_location?: string | null
          warehouse_receipt_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_converted_from_quote_id_fkey"
            columns: ["converted_from_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          company_name: string | null
          company_type: string | null
          created_at: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sli_documents: {
        Row: {
          aes_filing_id: string | null
          carrier_ship_date: string | null
          consignee_address: string | null
          consignee_name: string | null
          consignee_phone: string | null
          consignee_type: string | null
          containerized: boolean | null
          country_of_manufacture: string | null
          country_of_ultimate_destination: string | null
          created_at: string
          eccn: string | null
          exporter_ein: string | null
          exporting_carrier: string | null
          forwarder_authorization: string | null
          generated_url: string | null
          hazardous_material: boolean | null
          id: string
          inability_to_deliver: string | null
          license_info: string | null
          loading_pier: string | null
          method_of_transportation: string | null
          no_license_required: boolean | null
          point_state_of_origin: string | null
          port_of_export: string | null
          port_of_unloading: string | null
          related_parties: boolean | null
          routed_export_transaction: boolean | null
          shipment_id: string
          shipper_address: string | null
          shipper_certification: string | null
          shipper_contact_person: string | null
          shipper_email: string | null
          shipper_name: string | null
          shipper_phone: string | null
          shipper_reference_number: string | null
          shipper_representative_title: string | null
          special_instructions: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aes_filing_id?: string | null
          carrier_ship_date?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          consignee_type?: string | null
          containerized?: boolean | null
          country_of_manufacture?: string | null
          country_of_ultimate_destination?: string | null
          created_at?: string
          eccn?: string | null
          exporter_ein?: string | null
          exporting_carrier?: string | null
          forwarder_authorization?: string | null
          generated_url?: string | null
          hazardous_material?: boolean | null
          id?: string
          inability_to_deliver?: string | null
          license_info?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          no_license_required?: boolean | null
          point_state_of_origin?: string | null
          port_of_export?: string | null
          port_of_unloading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          shipment_id: string
          shipper_address?: string | null
          shipper_certification?: string | null
          shipper_contact_person?: string | null
          shipper_email?: string | null
          shipper_name?: string | null
          shipper_phone?: string | null
          shipper_reference_number?: string | null
          shipper_representative_title?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aes_filing_id?: string | null
          carrier_ship_date?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          consignee_type?: string | null
          containerized?: boolean | null
          country_of_manufacture?: string | null
          country_of_ultimate_destination?: string | null
          created_at?: string
          eccn?: string | null
          exporter_ein?: string | null
          exporting_carrier?: string | null
          forwarder_authorization?: string | null
          generated_url?: string | null
          hazardous_material?: boolean | null
          id?: string
          inability_to_deliver?: string | null
          license_info?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          no_license_required?: boolean | null
          point_state_of_origin?: string | null
          port_of_export?: string | null
          port_of_unloading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          shipment_id?: string
          shipper_address?: string | null
          shipper_certification?: string | null
          shipper_contact_person?: string | null
          shipper_email?: string | null
          shipper_name?: string | null
          shipper_phone?: string | null
          shipper_reference_number?: string | null
          shipper_representative_title?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sli_documents_aes_filing_id_fkey"
            columns: ["aes_filing_id"]
            isOneToOne: false
            referencedRelation: "aes_filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sli_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
      trucking_quotes: {
        Row: {
          company_name: string | null
          created_at: string
          currency: string
          driver_name: string | null
          driver_phone: string | null
          equipment_type: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          pickup_date: string | null
          pickup_time: string | null
          price: number
          service_region: string | null
          shipment_id: string
          status: string
          truck_plate: string | null
          trucker_user_id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          currency?: string
          driver_name?: string | null
          driver_phone?: string | null
          equipment_type?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          price: number
          service_region?: string | null
          shipment_id: string
          status?: string
          truck_plate?: string | null
          trucker_user_id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          currency?: string
          driver_name?: string | null
          driver_phone?: string | null
          equipment_type?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          price?: number
          service_region?: string | null
          shipment_id?: string
          status?: string
          truck_plate?: string | null
          trucker_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trucking_quotes_shipment_id_fkey"
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
      vessel_bookings: {
        Row: {
          booking_number: string | null
          carrier: string | null
          container_count: number | null
          container_type: string | null
          created_at: string
          created_by: string
          edi_message_id: string | null
          edi_submitted: boolean
          id: string
          notes: string | null
          shipment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_number?: string | null
          carrier?: string | null
          container_count?: number | null
          container_type?: string | null
          created_at?: string
          created_by: string
          edi_message_id?: string | null
          edi_submitted?: boolean
          id?: string
          notes?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_number?: string | null
          carrier?: string | null
          container_count?: number | null
          container_type?: string | null
          created_at?: string
          created_by?: string
          edi_message_id?: string | null
          edi_submitted?: boolean
          id?: string
          notes?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_bookings_edi_message_id_fkey"
            columns: ["edi_message_id"]
            isOneToOne: false
            referencedRelation: "edi_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_bookings_shipment_id_fkey"
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
      warehouse_orders: {
        Row: {
          actual_date: string | null
          bay_number: string | null
          billing_status: string | null
          cargo_description: string | null
          container_numbers: string[] | null
          created_at: string
          expected_date: string | null
          handling_fee: number | null
          handling_instructions: string | null
          id: string
          notes: string | null
          num_packages: number | null
          order_type: string
          release_authorization: string | null
          release_to_name: string | null
          release_to_phone: string | null
          requester_user_id: string | null
          shipment_id: string | null
          status: string
          storage_end_date: string | null
          storage_instructions: string | null
          storage_rate_per_day: number | null
          storage_start_date: string | null
          storage_zone: string | null
          total_storage_charges: number | null
          updated_at: string
          volume: number | null
          warehouse_id: string | null
          warehouse_user_id: string | null
          weight: number | null
        }
        Insert: {
          actual_date?: string | null
          bay_number?: string | null
          billing_status?: string | null
          cargo_description?: string | null
          container_numbers?: string[] | null
          created_at?: string
          expected_date?: string | null
          handling_fee?: number | null
          handling_instructions?: string | null
          id?: string
          notes?: string | null
          num_packages?: number | null
          order_type?: string
          release_authorization?: string | null
          release_to_name?: string | null
          release_to_phone?: string | null
          requester_user_id?: string | null
          shipment_id?: string | null
          status?: string
          storage_end_date?: string | null
          storage_instructions?: string | null
          storage_rate_per_day?: number | null
          storage_start_date?: string | null
          storage_zone?: string | null
          total_storage_charges?: number | null
          updated_at?: string
          volume?: number | null
          warehouse_id?: string | null
          warehouse_user_id?: string | null
          weight?: number | null
        }
        Update: {
          actual_date?: string | null
          bay_number?: string | null
          billing_status?: string | null
          cargo_description?: string | null
          container_numbers?: string[] | null
          created_at?: string
          expected_date?: string | null
          handling_fee?: number | null
          handling_instructions?: string | null
          id?: string
          notes?: string | null
          num_packages?: number | null
          order_type?: string
          release_authorization?: string | null
          release_to_name?: string | null
          release_to_phone?: string | null
          requester_user_id?: string | null
          shipment_id?: string | null
          status?: string
          storage_end_date?: string | null
          storage_instructions?: string | null
          storage_rate_per_day?: number | null
          storage_start_date?: string | null
          storage_zone?: string | null
          total_storage_charges?: number | null
          updated_at?: string
          volume?: number | null
          warehouse_id?: string | null
          warehouse_user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capabilities: string[] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          operating_hours: string | null
          owner_user_id: string
          state: string | null
          status: string
          total_capacity_sqft: number | null
          updated_at: string
          warehouse_name: string
        }
        Insert: {
          address?: string | null
          capabilities?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          operating_hours?: string | null
          owner_user_id: string
          state?: string | null
          status?: string
          total_capacity_sqft?: number | null
          updated_at?: string
          warehouse_name: string
        }
        Update: {
          address?: string | null
          capabilities?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          operating_hours?: string | null
          owner_user_id?: string
          state?: string | null
          status?: string
          total_capacity_sqft?: number | null
          updated_at?: string
          warehouse_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_directory: {
        Row: {
          city: string | null
          company_name: string | null
          company_type: string | null
          country: string | null
          id: string | null
          industry: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          company_type?: string | null
          country?: string | null
          id?: string | null
          industry?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          company_type?: string | null
          country?: string | null
          id?: string | null
          industry?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      app_role:
        | "admin"
        | "ops_manager"
        | "sales"
        | "viewer"
        | "trucker"
        | "driver"
        | "warehouse"
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
      app_role: [
        "admin",
        "ops_manager",
        "sales",
        "viewer",
        "trucker",
        "driver",
        "warehouse",
      ],
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
