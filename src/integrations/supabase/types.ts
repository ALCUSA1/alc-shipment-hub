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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aes_filings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_match_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ai_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_matches: {
        Row: {
          created_at: string
          deal_type: string | null
          destination: string | null
          estimated_earnings: number | null
          id: string
          match_score: number | null
          match_type: string
          metadata: Json | null
          origin: string | null
          reason: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          trade_lane: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_type?: string | null
          destination?: string | null
          estimated_earnings?: number | null
          id?: string
          match_score?: number | null
          match_type?: string
          metadata?: Json | null
          origin?: string | null
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          trade_lane?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_type?: string | null
          destination?: string | null
          estimated_earnings?: number | null
          id?: string
          match_score?: number | null
          match_type?: string
          metadata?: Json | null
          origin?: string | null
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          trade_lane?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alc_carriers: {
        Row: {
          carrier_code: string
          carrier_name: string
          created_at: string
          id: string
          mode: string
          status: string
          updated_at: string
        }
        Insert: {
          carrier_code: string
          carrier_name: string
          created_at?: string
          id?: string
          mode?: string
          status?: string
          updated_at?: string
        }
        Update: {
          carrier_code?: string
          carrier_name?: string
          created_at?: string
          id?: string
          mode?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      alc_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          facility_code: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          postal_code: string | null
          state: string | null
          unlocode: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          facility_code?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          unlocode?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          facility_code?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          unlocode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alc_vessels: {
        Row: {
          carrier_id: string | null
          created_at: string
          id: string
          imo_number: string | null
          mmsi: string | null
          operator_name: string | null
          updated_at: string
          vessel_name: string
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string
          id?: string
          imo_number?: string | null
          mmsi?: string | null
          operator_name?: string | null
          updated_at?: string
          vessel_name: string
        }
        Update: {
          carrier_id?: string | null
          created_at?: string
          id?: string
          imo_number?: string | null
          mmsi?: string | null
          operator_name?: string | null
          updated_at?: string
          vessel_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alc_vessels_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_type: string
          assigned_to_user_id: string | null
          company_id: string
          created_at: string
          decided_at: string | null
          decision_note: string | null
          entity_id: string
          entity_type: string
          id: string
          reason_note: string | null
          requested_at: string
          requested_by_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_type: string
          assigned_to_user_id?: string | null
          company_id: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reason_note?: string | null
          requested_at?: string
          requested_by_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          assigned_to_user_id?: string | null
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reason_note?: string | null
          requested_at?: string
          requested_by_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
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
      booking_charges: {
        Row: {
          alc_carrier_id: string | null
          amount: number | null
          booking_id: string
          calculation_basis: string | null
          charge_code: string | null
          charge_description: string | null
          created_at: string
          currency_code: string | null
          id: string
          payment_term_code: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          amount?: number | null
          booking_id: string
          calculation_basis?: string | null
          charge_code?: string | null
          charge_description?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          payment_term_code?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          amount?: number | null
          booking_id?: string
          calculation_basis?: string | null
          charge_code?: string | null
          charge_description?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          payment_term_code?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_charges_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_commodities: {
        Row: {
          alc_carrier_id: string | null
          booking_equipment_id: string | null
          booking_id: string
          cargo_gross_volume_unit: string | null
          cargo_gross_volume_value: number | null
          cargo_gross_weight_unit: string | null
          cargo_gross_weight_value: number | null
          cargo_net_volume_unit: string | null
          cargo_net_volume_value: number | null
          cargo_net_weight_unit: string | null
          cargo_net_weight_value: number | null
          commodity_sub_reference: string | null
          commodity_type: string | null
          created_at: string
          hs_code: string | null
          id: string
          number_of_packages: number | null
          package_code: string | null
          package_description: string | null
          shipment_id: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_equipment_id?: string | null
          booking_id: string
          cargo_gross_volume_unit?: string | null
          cargo_gross_volume_value?: number | null
          cargo_gross_weight_unit?: string | null
          cargo_gross_weight_value?: number | null
          cargo_net_volume_unit?: string | null
          cargo_net_volume_value?: number | null
          cargo_net_weight_unit?: string | null
          cargo_net_weight_value?: number | null
          commodity_sub_reference?: string | null
          commodity_type?: string | null
          created_at?: string
          hs_code?: string | null
          id?: string
          number_of_packages?: number | null
          package_code?: string | null
          package_description?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_equipment_id?: string | null
          booking_id?: string
          cargo_gross_volume_unit?: string | null
          cargo_gross_volume_value?: number | null
          cargo_gross_weight_unit?: string | null
          cargo_gross_weight_value?: number | null
          cargo_net_volume_unit?: string | null
          cargo_net_volume_value?: number | null
          cargo_net_weight_unit?: string | null
          cargo_net_weight_value?: number | null
          commodity_sub_reference?: string | null
          commodity_type?: string | null
          created_at?: string
          hs_code?: string | null
          id?: string
          number_of_packages?: number | null
          package_code?: string | null
          package_description?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_commodities_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commodities_booking_equipment_id_fkey"
            columns: ["booking_equipment_id"]
            isOneToOne: false
            referencedRelation: "booking_equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commodities_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commodities_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commodities_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commodities_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_customs_references: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          country_code: string | null
          created_at: string
          customs_reference_type: string
          id: string
          reference_value: string
          shipment_id: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          country_code?: string | null
          created_at?: string
          customs_reference_type: string
          id?: string
          reference_value: string
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          country_code?: string | null
          created_at?: string
          customs_reference_type?: string
          id?: string
          reference_value?: string
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_customs_references_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_customs_references_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_customs_references_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_customs_references_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_customs_references_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_equipments: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          cargo_gross_weight_unit: string | null
          cargo_gross_weight_value: number | null
          container_positioning_datetime: string | null
          container_positioning_location_id: string | null
          created_at: string
          dangerous_goods_flag: boolean | null
          empty_pickup_datetime: string | null
          empty_pickup_location_id: string | null
          equipment_description: string | null
          equipment_reference_type: string | null
          equipment_reference_value: string | null
          equipment_type_code: string | null
          gross_weight: number | null
          humidity_setting: string | null
          id: string
          is_non_operating_reefer: boolean | null
          is_shipper_owned: boolean | null
          iso_equipment_code: string | null
          overdimension_flag: boolean | null
          quantity: number | null
          reefer_flag: boolean | null
          shipment_id: string | null
          source_message_id: string | null
          tare_weight_unit: string | null
          tare_weight_value: number | null
          temperature_setting: string | null
          units: number | null
          updated_at: string
          ventilation_setting: string | null
          volume: number | null
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          cargo_gross_weight_unit?: string | null
          cargo_gross_weight_value?: number | null
          container_positioning_datetime?: string | null
          container_positioning_location_id?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          empty_pickup_datetime?: string | null
          empty_pickup_location_id?: string | null
          equipment_description?: string | null
          equipment_reference_type?: string | null
          equipment_reference_value?: string | null
          equipment_type_code?: string | null
          gross_weight?: number | null
          humidity_setting?: string | null
          id?: string
          is_non_operating_reefer?: boolean | null
          is_shipper_owned?: boolean | null
          iso_equipment_code?: string | null
          overdimension_flag?: boolean | null
          quantity?: number | null
          reefer_flag?: boolean | null
          shipment_id?: string | null
          source_message_id?: string | null
          tare_weight_unit?: string | null
          tare_weight_value?: number | null
          temperature_setting?: string | null
          units?: number | null
          updated_at?: string
          ventilation_setting?: string | null
          volume?: number | null
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          cargo_gross_weight_unit?: string | null
          cargo_gross_weight_value?: number | null
          container_positioning_datetime?: string | null
          container_positioning_location_id?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          empty_pickup_datetime?: string | null
          empty_pickup_location_id?: string | null
          equipment_description?: string | null
          equipment_reference_type?: string | null
          equipment_reference_value?: string | null
          equipment_type_code?: string | null
          gross_weight?: number | null
          humidity_setting?: string | null
          id?: string
          is_non_operating_reefer?: boolean | null
          is_shipper_owned?: boolean | null
          iso_equipment_code?: string | null
          overdimension_flag?: boolean | null
          quantity?: number | null
          reefer_flag?: boolean | null
          shipment_id?: string | null
          source_message_id?: string | null
          tare_weight_unit?: string | null
          tare_weight_value?: number | null
          temperature_setting?: string | null
          units?: number | null
          updated_at?: string
          ventilation_setting?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_equipments_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_container_positioning_location_id_fkey"
            columns: ["container_positioning_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_empty_pickup_location_id_fkey"
            columns: ["empty_pickup_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipments_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_instructions: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          created_at: string
          id: string
          instruction_text: string | null
          instruction_type: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          instruction_text?: string | null
          instruction_type?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          instruction_text?: string | null
          instruction_type?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_instructions_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_instructions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_instructions_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
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
      booking_locations: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          created_at: string
          id: string
          location_id: string | null
          location_name_snapshot: string | null
          location_type_code: string
          shipment_id: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          location_name_snapshot?: string | null
          location_type_code: string
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          location_name_snapshot?: string | null
          location_type_code?: string
          shipment_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_locations_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locations_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notifications: {
        Row: {
          alc_carrier_id: string | null
          amended_booking_status: string | null
          booking_id: string | null
          booking_status: string | null
          carrier_booking_reference: string | null
          carrier_booking_request_reference: string | null
          created_at: string
          id: string
          notification_id: string | null
          notification_source: string | null
          notification_time: string | null
          notification_type: string | null
          source_message_id: string | null
          subscription_reference: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          amended_booking_status?: string | null
          booking_id?: string | null
          booking_status?: string | null
          carrier_booking_reference?: string | null
          carrier_booking_request_reference?: string | null
          created_at?: string
          id?: string
          notification_id?: string | null
          notification_source?: string | null
          notification_time?: string | null
          notification_type?: string | null
          source_message_id?: string | null
          subscription_reference?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          amended_booking_status?: string | null
          booking_id?: string | null
          booking_status?: string | null
          carrier_booking_reference?: string | null
          carrier_booking_request_reference?: string | null
          created_at?: string
          id?: string
          notification_id?: string | null
          notification_source?: string | null
          notification_time?: string | null
          notification_type?: string | null
          source_message_id?: string | null
          subscription_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notifications_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_parties: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          alc_carrier_id: string | null
          booking_id: string
          city: string | null
          code_list_provider: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country_code: string | null
          created_at: string
          id: string
          party_code: string | null
          party_name: string
          party_reference: string | null
          party_role: string
          postal_code: string | null
          purchase_order_reference: string | null
          shipment_id: string | null
          source_message_id: string | null
          state_region: string | null
          tax_reference_type: string | null
          tax_reference_value: string | null
          unlocation_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          alc_carrier_id?: string | null
          booking_id: string
          city?: string | null
          code_list_provider?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          party_code?: string | null
          party_name: string
          party_reference?: string | null
          party_role: string
          postal_code?: string | null
          purchase_order_reference?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          state_region?: string | null
          tax_reference_type?: string | null
          tax_reference_value?: string | null
          unlocation_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          alc_carrier_id?: string | null
          booking_id?: string
          city?: string | null
          code_list_provider?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          party_code?: string | null
          party_name?: string
          party_reference?: string | null
          party_role?: string
          postal_code?: string | null
          purchase_order_reference?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          state_region?: string | null
          tax_reference_type?: string | null
          tax_reference_value?: string | null
          unlocation_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_parties_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_parties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_parties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_parties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_parties_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          alc_carrier_id: string | null
          amended_booking_status: string | null
          amendment_number: number | null
          booking_channel_reference: string | null
          booking_confirmation_status: string | null
          booking_date: string | null
          booking_request_created_datetime: string | null
          booking_request_status: string | null
          booking_request_updated_datetime: string | null
          booking_status: string | null
          booking_status_internal: string | null
          cargo_movement_type_at_destination: string | null
          cargo_movement_type_at_origin: string | null
          carrier_booking_number: string | null
          carrier_booking_request_reference: string | null
          carrier_export_voyage_number: string | null
          carrier_service_code: string | null
          carrier_service_name: string | null
          communication_channel_code: string | null
          contract_quotation_reference: string | null
          created_at: string
          dcsa_version: string | null
          declared_value: number | null
          declared_value_currency: string | null
          delivery_type_at_destination: string | null
          expected_arrival_at_place_of_delivery_end_date: string | null
          expected_arrival_at_place_of_delivery_start_date: string | null
          expected_arrival_date: string | null
          expected_departure_date: string | null
          export_declaration_reference: string | null
          freight_payment_term_code: string | null
          id: string
          inco_terms: string | null
          invoice_payable_at: string | null
          invoice_payable_at_location_id: string | null
          is_equipment_substitution_allowed: boolean | null
          is_export_declaration_required: boolean | null
          is_import_license_required: boolean | null
          is_partial_load_allowed: boolean | null
          payment_term_code: string | null
          place_of_bl_issue_location_id: string | null
          pre_carriage_mode: string | null
          quotation_reference: string | null
          receipt_type_at_origin: string | null
          requested_commodity_count: number | null
          requested_container_count: number | null
          requested_equipment_count: number | null
          service_contract_reference: string | null
          shipment_id: string | null
          source_message_id: string | null
          submission_datetime: string | null
          terms_and_conditions: string | null
          transport_document_reference: string | null
          transport_document_type_code: string | null
          universal_export_voyage_reference: string | null
          universal_service_reference: string | null
          updated_at: string
          updated_datetime: string | null
          vessel_imo_number: string | null
          vessel_name: string | null
        }
        Insert: {
          alc_carrier_id?: string | null
          amended_booking_status?: string | null
          amendment_number?: number | null
          booking_channel_reference?: string | null
          booking_confirmation_status?: string | null
          booking_date?: string | null
          booking_request_created_datetime?: string | null
          booking_request_status?: string | null
          booking_request_updated_datetime?: string | null
          booking_status?: string | null
          booking_status_internal?: string | null
          cargo_movement_type_at_destination?: string | null
          cargo_movement_type_at_origin?: string | null
          carrier_booking_number?: string | null
          carrier_booking_request_reference?: string | null
          carrier_export_voyage_number?: string | null
          carrier_service_code?: string | null
          carrier_service_name?: string | null
          communication_channel_code?: string | null
          contract_quotation_reference?: string | null
          created_at?: string
          dcsa_version?: string | null
          declared_value?: number | null
          declared_value_currency?: string | null
          delivery_type_at_destination?: string | null
          expected_arrival_at_place_of_delivery_end_date?: string | null
          expected_arrival_at_place_of_delivery_start_date?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          export_declaration_reference?: string | null
          freight_payment_term_code?: string | null
          id?: string
          inco_terms?: string | null
          invoice_payable_at?: string | null
          invoice_payable_at_location_id?: string | null
          is_equipment_substitution_allowed?: boolean | null
          is_export_declaration_required?: boolean | null
          is_import_license_required?: boolean | null
          is_partial_load_allowed?: boolean | null
          payment_term_code?: string | null
          place_of_bl_issue_location_id?: string | null
          pre_carriage_mode?: string | null
          quotation_reference?: string | null
          receipt_type_at_origin?: string | null
          requested_commodity_count?: number | null
          requested_container_count?: number | null
          requested_equipment_count?: number | null
          service_contract_reference?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          submission_datetime?: string | null
          terms_and_conditions?: string | null
          transport_document_reference?: string | null
          transport_document_type_code?: string | null
          universal_export_voyage_reference?: string | null
          universal_service_reference?: string | null
          updated_at?: string
          updated_datetime?: string | null
          vessel_imo_number?: string | null
          vessel_name?: string | null
        }
        Update: {
          alc_carrier_id?: string | null
          amended_booking_status?: string | null
          amendment_number?: number | null
          booking_channel_reference?: string | null
          booking_confirmation_status?: string | null
          booking_date?: string | null
          booking_request_created_datetime?: string | null
          booking_request_status?: string | null
          booking_request_updated_datetime?: string | null
          booking_status?: string | null
          booking_status_internal?: string | null
          cargo_movement_type_at_destination?: string | null
          cargo_movement_type_at_origin?: string | null
          carrier_booking_number?: string | null
          carrier_booking_request_reference?: string | null
          carrier_export_voyage_number?: string | null
          carrier_service_code?: string | null
          carrier_service_name?: string | null
          communication_channel_code?: string | null
          contract_quotation_reference?: string | null
          created_at?: string
          dcsa_version?: string | null
          declared_value?: number | null
          declared_value_currency?: string | null
          delivery_type_at_destination?: string | null
          expected_arrival_at_place_of_delivery_end_date?: string | null
          expected_arrival_at_place_of_delivery_start_date?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          export_declaration_reference?: string | null
          freight_payment_term_code?: string | null
          id?: string
          inco_terms?: string | null
          invoice_payable_at?: string | null
          invoice_payable_at_location_id?: string | null
          is_equipment_substitution_allowed?: boolean | null
          is_export_declaration_required?: boolean | null
          is_import_license_required?: boolean | null
          is_partial_load_allowed?: boolean | null
          payment_term_code?: string | null
          place_of_bl_issue_location_id?: string | null
          pre_carriage_mode?: string | null
          quotation_reference?: string | null
          receipt_type_at_origin?: string | null
          requested_commodity_count?: number | null
          requested_container_count?: number | null
          requested_equipment_count?: number | null
          service_contract_reference?: string | null
          shipment_id?: string | null
          source_message_id?: string | null
          submission_datetime?: string | null
          terms_and_conditions?: string | null
          transport_document_reference?: string | null
          transport_document_type_code?: string | null
          universal_export_voyage_reference?: string | null
          universal_service_reference?: string | null
          updated_at?: string
          updated_datetime?: string | null
          vessel_imo_number?: string | null
          vessel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_invoice_payable_at_location_id_fkey"
            columns: ["invoice_payable_at_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_place_of_bl_issue_location_id_fkey"
            columns: ["place_of_bl_issue_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_details: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          cargo_line_number: number | null
          commodity_description: string | null
          created_at: string
          dangerous_goods_flag: boolean | null
          gross_weight: number | null
          hs_code: string | null
          id: string
          marks_and_numbers: string | null
          net_weight: number | null
          package_count: number | null
          package_type_code: string | null
          shipping_instruction_id: string | null
          source_message_id: string | null
          transport_document_id: string | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          cargo_line_number?: number | null
          commodity_description?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          gross_weight?: number | null
          hs_code?: string | null
          id?: string
          marks_and_numbers?: string | null
          net_weight?: number | null
          package_count?: number | null
          package_type_code?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          cargo_line_number?: number | null
          commodity_description?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          gross_weight?: number | null
          hs_code?: string | null
          id?: string
          marks_and_numbers?: string | null
          net_weight?: number | null
          package_count?: number | null
          package_type_code?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_details_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_details_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_details_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_details_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_connections: {
        Row: {
          access_token_encrypted: string | null
          api_key_header_name: string | null
          auth_type: string
          base_url: string | null
          carrier_id: string
          created_at: string
          credential_key_name: string | null
          environment: string
          id: string
          integration_type: string
          last_success_at: string | null
          oauth_client_id: string | null
          oauth_client_secret_key_name: string | null
          oauth_token_url: string | null
          status: string
          token_expires_at: string | null
          token_scope: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          api_key_header_name?: string | null
          auth_type?: string
          base_url?: string | null
          carrier_id: string
          created_at?: string
          credential_key_name?: string | null
          environment?: string
          id?: string
          integration_type?: string
          last_success_at?: string | null
          oauth_client_id?: string | null
          oauth_client_secret_key_name?: string | null
          oauth_token_url?: string | null
          status?: string
          token_expires_at?: string | null
          token_scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          api_key_header_name?: string | null
          auth_type?: string
          base_url?: string | null
          carrier_id?: string
          created_at?: string
          credential_key_name?: string | null
          environment?: string
          id?: string
          integration_type?: string
          last_success_at?: string | null
          oauth_client_id?: string | null
          oauth_client_secret_key_name?: string | null
          oauth_token_url?: string | null
          status?: string
          token_expires_at?: string | null
          token_scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_connections_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_event_mappings: {
        Row: {
          active: boolean
          carrier_id: string
          created_at: string
          event_classifier_code: string | null
          event_scope: string | null
          external_code: string
          external_name: string | null
          id: string
          internal_classifier: string | null
          internal_code: string
          internal_name: string
          message_family: string
          status_category: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          carrier_id: string
          created_at?: string
          event_classifier_code?: string | null
          event_scope?: string | null
          external_code: string
          external_name?: string | null
          id?: string
          internal_classifier?: string | null
          internal_code: string
          internal_name: string
          message_family: string
          status_category?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          carrier_id?: string
          created_at?: string
          event_classifier_code?: string | null
          event_scope?: string | null
          external_code?: string
          external_name?: string | null
          id?: string
          internal_classifier?: string | null
          internal_code?: string
          internal_name?: string
          message_family?: string
          status_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_event_mappings_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
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
          contract_number: string | null
          created_at: string
          currency: string
          destination_port: string
          free_time_days: number | null
          id: string
          mode: string
          notes: string | null
          origin_port: string
          rate_basis_type: string | null
          service_level: string | null
          surcharges: Json
          trade_lane: string | null
          transit_days: number | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          base_rate: number
          carrier: string
          container_type: string
          contract_number?: string | null
          created_at?: string
          currency?: string
          destination_port: string
          free_time_days?: number | null
          id?: string
          mode?: string
          notes?: string | null
          origin_port: string
          rate_basis_type?: string | null
          service_level?: string | null
          surcharges?: Json
          trade_lane?: string | null
          transit_days?: number | null
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          base_rate?: number
          carrier?: string
          container_type?: string
          contract_number?: string | null
          created_at?: string
          currency?: string
          destination_port?: string
          free_time_days?: number | null
          id?: string
          mode?: string
          notes?: string | null
          origin_port?: string
          rate_basis_type?: string | null
          service_level?: string | null
          surcharges?: Json
          trade_lane?: string | null
          transit_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      carrier_raw_messages: {
        Row: {
          carrier_id: string
          created_at: string
          error_message: string | null
          external_reference: string | null
          headers_json: Json | null
          http_status: number | null
          id: string
          message_family: string
          message_type: string
          payload_format: string
          processed_at: string | null
          processing_status: string
          received_at: string
          request_payload_json: Json | null
          response_payload_json: Json | null
          source_channel: string
          updated_at: string
        }
        Insert: {
          carrier_id: string
          created_at?: string
          error_message?: string | null
          external_reference?: string | null
          headers_json?: Json | null
          http_status?: number | null
          id?: string
          message_family: string
          message_type: string
          payload_format?: string
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          request_payload_json?: Json | null
          response_payload_json?: Json | null
          source_channel?: string
          updated_at?: string
        }
        Update: {
          carrier_id?: string
          created_at?: string
          error_message?: string | null
          external_reference?: string | null
          headers_json?: Json | null
          http_status?: number | null
          id?: string
          message_family?: string
          message_type?: string
          payload_format?: string
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          request_payload_json?: Json | null
          response_payload_json?: Json | null
          source_channel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_raw_messages_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_schedule_queries: {
        Row: {
          arrival_date_from: string | null
          arrival_date_to: string | null
          carrier_id: string | null
          carrier_voyage_number: string | null
          created_at: string
          delivery_type_at_destination: string | null
          departure_date_from: string | null
          departure_date_to: string | null
          id: string
          max_transhipment: number | null
          next_page_cursor: string | null
          place_of_arrival_location_id: string | null
          place_of_delivery_location_id: string | null
          place_of_departure_location_id: string | null
          place_of_receipt_location_id: string | null
          port_of_discharge_location_id: string | null
          port_of_loading_location_id: string | null
          query_type: string
          receipt_type_at_origin: string | null
          service_code: string | null
          source_message_id: string | null
          un_location_code: string | null
          updated_at: string
          vessel_id: string | null
          vessel_imo_number: string | null
          voyage_number: string | null
        }
        Insert: {
          arrival_date_from?: string | null
          arrival_date_to?: string | null
          carrier_id?: string | null
          carrier_voyage_number?: string | null
          created_at?: string
          delivery_type_at_destination?: string | null
          departure_date_from?: string | null
          departure_date_to?: string | null
          id?: string
          max_transhipment?: number | null
          next_page_cursor?: string | null
          place_of_arrival_location_id?: string | null
          place_of_delivery_location_id?: string | null
          place_of_departure_location_id?: string | null
          place_of_receipt_location_id?: string | null
          port_of_discharge_location_id?: string | null
          port_of_loading_location_id?: string | null
          query_type?: string
          receipt_type_at_origin?: string | null
          service_code?: string | null
          source_message_id?: string | null
          un_location_code?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_imo_number?: string | null
          voyage_number?: string | null
        }
        Update: {
          arrival_date_from?: string | null
          arrival_date_to?: string | null
          carrier_id?: string | null
          carrier_voyage_number?: string | null
          created_at?: string
          delivery_type_at_destination?: string | null
          departure_date_from?: string | null
          departure_date_to?: string | null
          id?: string
          max_transhipment?: number | null
          next_page_cursor?: string | null
          place_of_arrival_location_id?: string | null
          place_of_delivery_location_id?: string | null
          place_of_departure_location_id?: string | null
          place_of_receipt_location_id?: string | null
          port_of_discharge_location_id?: string | null
          port_of_loading_location_id?: string | null
          query_type?: string
          receipt_type_at_origin?: string | null
          service_code?: string | null
          source_message_id?: string | null
          un_location_code?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_imo_number?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_schedule_queries_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_place_of_arrival_location_id_fkey"
            columns: ["place_of_arrival_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_place_of_delivery_location_id_fkey"
            columns: ["place_of_delivery_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_place_of_departure_location_id_fkey"
            columns: ["place_of_departure_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_place_of_receipt_location_id_fkey"
            columns: ["place_of_receipt_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_port_of_discharge_location_id_fkey"
            columns: ["port_of_discharge_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_port_of_loading_location_id_fkey"
            columns: ["port_of_loading_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedule_queries_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_schedules: {
        Row: {
          carrier_id: string | null
          created_at: string
          id: string
          is_direct_service: boolean | null
          query_id: string | null
          schedule_reference: string | null
          schedule_source_type: string | null
          schedule_type: string
          service_code: string | null
          service_name: string | null
          source_message_id: string | null
          total_leg_count: number | null
          transit_time_days: number | null
          updated_at: string
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string
          id?: string
          is_direct_service?: boolean | null
          query_id?: string | null
          schedule_reference?: string | null
          schedule_source_type?: string | null
          schedule_type?: string
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          total_leg_count?: number | null
          transit_time_days?: number | null
          updated_at?: string
        }
        Update: {
          carrier_id?: string | null
          created_at?: string
          id?: string
          is_direct_service?: boolean | null
          query_id?: string | null
          schedule_reference?: string | null
          schedule_source_type?: string | null
          schedule_type?: string
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          total_leg_count?: number | null
          transit_time_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_schedules_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedules_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedule_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_schedules_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
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
          company_contact_name: string | null
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
          company_contact_name?: string | null
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
          company_contact_name?: string | null
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
          {
            foreignKeyName: "company_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
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
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
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
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          is_active: boolean
          joined_at: string | null
          role: Database["public"]["Enums"]["company_role"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          rating: number
          reviewed_company_id: string
          reviewer_company_id: string | null
          reviewer_user_id: string
          title: string | null
          transaction_type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewed_company_id: string
          reviewer_company_id?: string | null
          reviewer_user_id: string
          title?: string | null
          transaction_type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewed_company_id?: string
          reviewer_company_id?: string | null
          reviewer_user_id?: string
          title?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_reviewed_company_id_fkey"
            columns: ["reviewed_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewed_company_id_fkey"
            columns: ["reviewed_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewed_company_id_fkey"
            columns: ["reviewed_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_company_id_fkey"
            columns: ["reviewer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_company_id_fkey"
            columns: ["reviewer_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_company_id_fkey"
            columns: ["reviewer_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reviews: {
        Row: {
          admin_notes: string | null
          aes_type: string | null
          created_at: string
          export_license: string | null
          exporter_ein: string | null
          exporter_name: string | null
          id: string
          insurance_coverage: string | null
          insurance_policy: string | null
          insurance_provider: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shipment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          aes_type?: string | null
          created_at?: string
          export_license?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          id?: string
          insurance_coverage?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          aes_type?: string | null
          created_at?: string
          export_license?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          id?: string
          insurance_coverage?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reviews_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reviews_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
            referencedRelation: "shipment_workspace_view"
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
      container_seals: {
        Row: {
          carrier_id: string | null
          container_id: string
          created_at: string
          id: string
          seal_number: string
          seal_source: string | null
          updated_at: string
        }
        Insert: {
          carrier_id?: string | null
          container_id: string
          created_at?: string
          id?: string
          seal_number: string
          seal_source?: string | null
          updated_at?: string
        }
        Update: {
          carrier_id?: string | null
          container_id?: string
          created_at?: string
          id?: string
          seal_number?: string
          seal_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "container_seals_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_seals_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
        ]
      }
      containers: {
        Row: {
          alc_carrier_id: string | null
          container_number: string | null
          container_size: string | null
          container_type: string
          created_at: string
          equipment_reference: string | null
          equipment_size_type: string | null
          id: string
          iso_equipment_code: string | null
          max_payload: number | null
          oog_dimensions: string | null
          pickup_date: string | null
          quantity: number
          reefer_temp: string | null
          return_date: string | null
          seal_number: string | null
          shipment_id: string
          status: string | null
          tare_weight: number | null
          vgm: number | null
        }
        Insert: {
          alc_carrier_id?: string | null
          container_number?: string | null
          container_size?: string | null
          container_type: string
          created_at?: string
          equipment_reference?: string | null
          equipment_size_type?: string | null
          id?: string
          iso_equipment_code?: string | null
          max_payload?: number | null
          oog_dimensions?: string | null
          pickup_date?: string | null
          quantity?: number
          reefer_temp?: string | null
          return_date?: string | null
          seal_number?: string | null
          shipment_id: string
          status?: string | null
          tare_weight?: number | null
          vgm?: number | null
        }
        Update: {
          alc_carrier_id?: string | null
          container_number?: string | null
          container_size?: string | null
          container_type?: string
          created_at?: string
          equipment_reference?: string | null
          equipment_size_type?: string | null
          id?: string
          iso_equipment_code?: string | null
          max_payload?: number | null
          oog_dimensions?: string | null
          pickup_date?: string | null
          quantity?: number
          reefer_temp?: string | null
          return_date?: string | null
          seal_number?: string | null
          shipment_id?: string
          status?: string | null
          tare_weight?: number | null
          vgm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "containers_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "containers_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
      customer_user_links: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_filings: {
        Row: {
          aes_citation: string | null
          authorized_agent_address: string | null
          authorized_agent_ein: string | null
          authorized_agent_name: string | null
          broker_email: string | null
          broker_name: string | null
          broker_ref: string | null
          carrier_identification_code: string | null
          carrier_name: string | null
          consignee_address: string | null
          consignee_name: string | null
          containerized: boolean | null
          country_of_destination: string | null
          created_at: string
          eei_exemption_citation: string | null
          entry_number: string | null
          export_date: string | null
          exporter_ein: string | null
          exporter_name: string | null
          filing_option: string | null
          filing_type: string
          forwarder_authorization_language: string | null
          hazardous_materials: boolean | null
          hts_codes: Json | null
          id: string
          in_bond_code: string | null
          itn: string | null
          loading_pier: string | null
          method_of_transportation: string | null
          mode_of_transport: string | null
          notes: string | null
          original_itn: string | null
          port_of_export: string | null
          port_of_unlading: string | null
          related_parties: boolean | null
          routed_export_transaction: boolean | null
          shipment_id: string
          shipment_reference_number: string | null
          shipper_certification_language: string | null
          state_of_origin: string | null
          status: string
          submitted_at: string | null
          title_of_shipper_representative: string | null
          ultimate_consignee_type: string | null
          updated_at: string
          user_id: string
          usppi_address: string | null
          usppi_contact_name: string | null
          usppi_email: string | null
          usppi_phone: string | null
          vessel_name: string | null
          voyage_number: string | null
          xtn: string | null
        }
        Insert: {
          aes_citation?: string | null
          authorized_agent_address?: string | null
          authorized_agent_ein?: string | null
          authorized_agent_name?: string | null
          broker_email?: string | null
          broker_name?: string | null
          broker_ref?: string | null
          carrier_identification_code?: string | null
          carrier_name?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          containerized?: boolean | null
          country_of_destination?: string | null
          created_at?: string
          eei_exemption_citation?: string | null
          entry_number?: string | null
          export_date?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          filing_option?: string | null
          filing_type?: string
          forwarder_authorization_language?: string | null
          hazardous_materials?: boolean | null
          hts_codes?: Json | null
          id?: string
          in_bond_code?: string | null
          itn?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          mode_of_transport?: string | null
          notes?: string | null
          original_itn?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          shipment_id: string
          shipment_reference_number?: string | null
          shipper_certification_language?: string | null
          state_of_origin?: string | null
          status?: string
          submitted_at?: string | null
          title_of_shipper_representative?: string | null
          ultimate_consignee_type?: string | null
          updated_at?: string
          user_id: string
          usppi_address?: string | null
          usppi_contact_name?: string | null
          usppi_email?: string | null
          usppi_phone?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
          xtn?: string | null
        }
        Update: {
          aes_citation?: string | null
          authorized_agent_address?: string | null
          authorized_agent_ein?: string | null
          authorized_agent_name?: string | null
          broker_email?: string | null
          broker_name?: string | null
          broker_ref?: string | null
          carrier_identification_code?: string | null
          carrier_name?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          containerized?: boolean | null
          country_of_destination?: string | null
          created_at?: string
          eei_exemption_citation?: string | null
          entry_number?: string | null
          export_date?: string | null
          exporter_ein?: string | null
          exporter_name?: string | null
          filing_option?: string | null
          filing_type?: string
          forwarder_authorization_language?: string | null
          hazardous_materials?: boolean | null
          hts_codes?: Json | null
          id?: string
          in_bond_code?: string | null
          itn?: string | null
          loading_pier?: string | null
          method_of_transportation?: string | null
          mode_of_transport?: string | null
          notes?: string | null
          original_itn?: string | null
          port_of_export?: string | null
          port_of_unlading?: string | null
          related_parties?: boolean | null
          routed_export_transaction?: boolean | null
          shipment_id?: string
          shipment_reference_number?: string | null
          shipper_certification_language?: string | null
          state_of_origin?: string | null
          status?: string
          submitted_at?: string | null
          title_of_shipper_representative?: string | null
          ultimate_consignee_type?: string | null
          updated_at?: string
          user_id?: string
          usppi_address?: string | null
          usppi_contact_name?: string | null
          usppi_email?: string | null
          usppi_phone?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
          xtn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_filings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
          carrier_specific_rules: string | null
          charge_type: string
          container_number: string | null
          contract_free_days: number | null
          contract_specific_rules: string | null
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
          street_turn_eligible: boolean | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          carrier_specific_rules?: string | null
          charge_type?: string
          container_number?: string | null
          contract_free_days?: number | null
          contract_specific_rules?: string | null
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
          street_turn_eligible?: boolean | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          carrier_specific_rules?: string | null
          charge_type?: string
          container_number?: string | null
          contract_free_days?: number | null
          contract_specific_rules?: string | null
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
          street_turn_eligible?: boolean | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demurrage_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demurrage_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requirements: {
        Row: {
          company_id: string | null
          created_at: string
          document_type: string
          id: string
          is_mandatory: boolean
          required_at_stage: string
          service_flag: string | null
          shipment_type: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          document_type: string
          id?: string
          is_mandatory?: boolean
          required_at_stage?: string
          service_flag?: string | null
          shipment_type?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          document_type?: string
          id?: string
          is_mandatory?: boolean
          required_at_stage?: string
          service_flag?: string | null
          shipment_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string | null
          created_at: string
          doc_type: string
          document_reference: string | null
          file_url: string | null
          id: string
          issuance_id: string | null
          metadata_json: Json | null
          shipment_id: string
          shipping_instruction_id: string | null
          source_message_id: string | null
          status: string
          transport_document_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          created_at?: string
          doc_type: string
          document_reference?: string | null
          file_url?: string | null
          id?: string
          issuance_id?: string | null
          metadata_json?: Json | null
          shipment_id: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          status?: string
          transport_document_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          created_at?: string
          doc_type?: string
          document_reference?: string | null
          file_url?: string | null
          id?: string
          issuance_id?: string | null
          metadata_json?: Json | null
          shipment_id?: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          status?: string
          transport_document_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
      earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string | null
          description: string
          earning_type: string
          id: string
          paid_at: string | null
          shipment_id: string | null
          source_ref: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string | null
          description: string
          earning_type?: string
          id?: string
          paid_at?: string | null
          shipment_id?: string | null
          source_ref?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string | null
          description?: string
          earning_type?: string
          id?: string
          paid_at?: string | null
          shipment_id?: string | null
          source_ref?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_balance: {
        Row: {
          available_balance: number
          id: string
          lifetime_earnings: number
          payment_method: string | null
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          id?: string
          lifetime_earnings?: number
          payment_method?: string | null
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          id?: string
          lifetime_earnings?: number
          payment_method?: string | null
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
      feature_request_comments: {
        Row: {
          content: string
          created_at: string
          feature_request_id: string
          id: string
          is_staff: boolean
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          feature_request_id: string
          id?: string
          is_staff?: boolean
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          feature_request_id?: string
          id?: string
          is_staff?: boolean
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_comments_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          company_name: string | null
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          company_name?: string | null
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          company_name?: string | null
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          company_name: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          media_urls: string[] | null
          original_post_id: string | null
          post_type: string
          share_count: number | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          company_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          media_urls?: string[] | null
          original_post_id?: string | null
          post_type?: string
          share_count?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          company_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          media_urls?: string[] | null
          original_post_id?: string | null
          post_type?: string
          share_count?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_cost_profiles: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          fixed_cost_per_shipment: number | null
          id: string
          monthly_marketing_cost: number
          monthly_office_cost: number
          monthly_shipment_volume: number
          monthly_software_cost: number
          monthly_team_cost: number
          monthly_tech_cost: number
          profile_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          fixed_cost_per_shipment?: number | null
          id?: string
          monthly_marketing_cost?: number
          monthly_office_cost?: number
          monthly_shipment_volume?: number
          monthly_software_cost?: number
          monthly_team_cost?: number
          monthly_tech_cost?: number
          profile_name?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          fixed_cost_per_shipment?: number | null
          id?: string
          monthly_marketing_cost?: number
          monthly_office_cost?: number
          monthly_shipment_volume?: number
          monthly_software_cost?: number
          monthly_team_cost?: number
          monthly_tech_cost?: number
          profile_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_cost_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_cost_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_cost_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      forwarder_customers: {
        Row: {
          accepted_at: string | null
          company_name: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_user_id: string | null
          forwarder_user_id: string
          id: string
          invited_at: string
          metadata: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_user_id?: string | null
          forwarder_user_id: string
          id?: string
          invited_at?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_user_id?: string | null
          forwarder_user_id?: string
          id?: string
          invited_at?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hs_code_reference: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string
          duty_rate: string | null
          id: string
          indent: number
          special_rate: string | null
          unit_of_quantity: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string
          duty_rate?: string | null
          id?: string
          indent?: number
          special_rate?: string | null
          unit_of_quantity?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string
          duty_rate?: string | null
          id?: string
          indent?: number
          special_rate?: string | null
          unit_of_quantity?: string | null
        }
        Relationships: []
      }
      hs_codes: {
        Row: {
          category: string | null
          code: string
          country_notes: string | null
          created_at: string
          description: string
          duty_rate: string | null
          id: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category?: string | null
          code: string
          country_notes?: string | null
          created_at?: string
          description?: string
          duty_rate?: string | null
          id?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category?: string | null
          code?: string
          country_notes?: string | null
          created_at?: string
          description?: string
          duty_rate?: string | null
          id?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      integration_jobs: {
        Row: {
          attempt_count: number
          carrier_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_status: string
          job_type: string
          last_error: string | null
          raw_message_id: string
          started_at: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          carrier_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_status?: string
          job_type: string
          last_error?: string | null
          raw_message_id: string
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          carrier_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_status?: string
          job_type?: string
          last_error?: string | null
          raw_message_id?: string
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_jobs_raw_message_id_fkey"
            columns: ["raw_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      issuance_errors: {
        Row: {
          alc_carrier_id: string | null
          created_at: string
          error_code: string | null
          error_code_text: string | null
          error_message: string | null
          id: string
          issuance_record_id: string
          json_path: string | null
          property_name: string | null
          property_value: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          created_at?: string
          error_code?: string | null
          error_code_text?: string | null
          error_message?: string | null
          id?: string
          issuance_record_id: string
          json_path?: string | null
          property_name?: string | null
          property_value?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          created_at?: string
          error_code?: string | null
          error_code_text?: string | null
          error_message?: string | null
          id?: string
          issuance_record_id?: string
          json_path?: string | null
          property_name?: string | null
          property_value?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuance_errors_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_errors_issuance_record_id_fkey"
            columns: ["issuance_record_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_errors_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      issuance_records: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string | null
          created_at: string
          ebill_identifier: string | null
          ebill_platform: string | null
          id: string
          issuance_completed_at: string | null
          issuance_reference: string | null
          issuance_requested_at: string | null
          issuance_response_code: string | null
          issuance_response_message: string | null
          issuance_status: string | null
          issuance_status_internal: string | null
          issuer_name: string | null
          receiver_name: string | null
          response_received_at: string | null
          shipment_id: string | null
          shipping_instruction_id: string | null
          source_message_id: string | null
          transport_document_id: string | null
          transport_document_reference: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          created_at?: string
          ebill_identifier?: string | null
          ebill_platform?: string | null
          id?: string
          issuance_completed_at?: string | null
          issuance_reference?: string | null
          issuance_requested_at?: string | null
          issuance_response_code?: string | null
          issuance_response_message?: string | null
          issuance_status?: string | null
          issuance_status_internal?: string | null
          issuer_name?: string | null
          receiver_name?: string | null
          response_received_at?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          transport_document_reference?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          created_at?: string
          ebill_identifier?: string | null
          ebill_platform?: string | null
          id?: string
          issuance_completed_at?: string | null
          issuance_reference?: string | null
          issuance_requested_at?: string | null
          issuance_response_code?: string | null
          issuance_response_message?: string | null
          issuance_status?: string | null
          issuance_status_internal?: string | null
          issuer_name?: string | null
          receiver_name?: string | null
          response_received_at?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          transport_document_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuance_records_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuance_records_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      issuance_response_code_mappings: {
        Row: {
          active: boolean
          alc_carrier_id: string | null
          created_at: string
          description: string | null
          external_response_code: string
          external_response_name: string | null
          id: string
          internal_status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          alc_carrier_id?: string | null
          created_at?: string
          description?: string | null
          external_response_code: string
          external_response_name?: string | null
          id?: string
          internal_status: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          alc_carrier_id?: string | null
          created_at?: string
          description?: string | null
          external_response_code?: string
          external_response_name?: string | null
          id?: string
          internal_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuance_response_code_mappings_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      issuance_response_codes: {
        Row: {
          active: boolean | null
          alc_carrier_id: string | null
          created_at: string
          id: string
          response_code: string
          response_description: string | null
          response_name: string | null
          status_category: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          response_code: string
          response_description?: string | null
          response_name?: string | null
          status_category?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          response_code?: string
          response_description?: string | null
          response_name?: string | null
          status_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuance_response_codes_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "leads_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
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
          severity: string | null
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
          severity?: string | null
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
          severity?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_user_links: {
        Row: {
          company_id: string
          created_at: string
          id: string
          partner_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          partner_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_company_id: string
          requester_user_id: string
          responded_at: string | null
          status: string
          target_company_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_company_id: string
          requester_user_id: string
          responded_at?: string | null
          status?: string
          target_company_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_company_id?: string
          requester_user_id?: string
          responded_at?: string | null
          status?: string
          target_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_requests_requester_company_id_fkey"
            columns: ["requester_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_requester_company_id_fkey"
            columns: ["requester_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_requester_company_id_fkey"
            columns: ["requester_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_splits: {
        Row: {
          amount: number
          bl_number: string | null
          carrier_name: string
          carrier_stripe_account_id: string | null
          created_at: string
          currency: string
          id: string
          payment_id: string
          platform_fee: number
          settled_at: string | null
          status: string
          stripe_transfer_id: string | null
          transfer_error: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bl_number?: string | null
          carrier_name: string
          carrier_stripe_account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id: string
          platform_fee?: number
          settled_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          transfer_error?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bl_number?: string | null
          carrier_name?: string
          carrier_stripe_account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string
          platform_fee?: number
          settled_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          transfer_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "shipment_workspace_view"
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
      pipeline_deals: {
        Row: {
          carrier: string | null
          company_id: string | null
          company_name: string | null
          confirmed_earnings: number | null
          created_at: string
          deal_amount: number | null
          deal_type: string
          destination: string | null
          estimated_earnings: number | null
          id: string
          notes: string | null
          origin: string | null
          paid_earnings: number | null
          shipment_id: string | null
          source_id: string | null
          source_type: string | null
          stage: string
          timeline: string | null
          title: string
          trade_lane: string | null
          updated_at: string
          user_id: string
          volume: string | null
        }
        Insert: {
          carrier?: string | null
          company_id?: string | null
          company_name?: string | null
          confirmed_earnings?: number | null
          created_at?: string
          deal_amount?: number | null
          deal_type?: string
          destination?: string | null
          estimated_earnings?: number | null
          id?: string
          notes?: string | null
          origin?: string | null
          paid_earnings?: number | null
          shipment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          stage?: string
          timeline?: string | null
          title: string
          trade_lane?: string | null
          updated_at?: string
          user_id: string
          volume?: string | null
        }
        Update: {
          carrier?: string | null
          company_id?: string | null
          company_name?: string | null
          confirmed_earnings?: number | null
          created_at?: string
          deal_amount?: number | null
          deal_type?: string
          destination?: string | null
          estimated_earnings?: number | null
          id?: string
          notes?: string | null
          origin?: string | null
          paid_earnings?: number | null
          shipment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          stage?: string
          timeline?: string | null
          title?: string
          trade_lane?: string | null
          updated_at?: string
          user_id?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_shipment_id_fkey"
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
      port_schedules: {
        Row: {
          arrival_datetime: string | null
          call_sequence: number | null
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          cutoff_datetime: string | null
          departure_datetime: string | null
          facility_code: string | null
          id: string
          location_id: string | null
          service_code: string | null
          service_name: string | null
          source_message_id: string | null
          updated_at: string
          vessel_id: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          arrival_datetime?: string | null
          call_sequence?: number | null
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          cutoff_datetime?: string | null
          departure_datetime?: string | null
          facility_code?: string | null
          id?: string
          location_id?: string | null
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          arrival_datetime?: string | null
          call_sequence?: number | null
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          cutoff_datetime?: string | null
          departure_datetime?: string | null
          facility_code?: string | null
          id?: string
          location_id?: string | null
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_schedules_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_schedules_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_schedules_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_schedules_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
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
      pricing_cost_lines: {
        Row: {
          amount: number
          cost_category: string
          cost_type: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          pricing_scenario_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cost_category: string
          cost_type: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          pricing_scenario_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cost_category?: string
          cost_type?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          pricing_scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_cost_lines_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "pricing_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_outputs: {
        Row: {
          break_even_price: number
          carrier_buy_rate: number | null
          collaboration_share: number | null
          contribution_margin_percent: number
          contribution_profit: number
          created_at: string
          fixed_cost_per_shipment: number
          gross_margin_percent: number
          gross_profit: number
          id: string
          minimum_acceptable_sell_price: number
          net_margin_percent: number
          net_profit: number
          network_share: number | null
          platform_retained_profit: number | null
          pricing_scenario_id: string
          recommended_sell_price: number
          referral_share: number | null
          sell_price: number | null
          stretch_sell_price: number
          total_direct_cost: number
          total_network_payout_cost: number
          total_variable_cost: number
          true_total_cost: number
          updated_at: string
        }
        Insert: {
          break_even_price?: number
          carrier_buy_rate?: number | null
          collaboration_share?: number | null
          contribution_margin_percent?: number
          contribution_profit?: number
          created_at?: string
          fixed_cost_per_shipment?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          minimum_acceptable_sell_price?: number
          net_margin_percent?: number
          net_profit?: number
          network_share?: number | null
          platform_retained_profit?: number | null
          pricing_scenario_id: string
          recommended_sell_price?: number
          referral_share?: number | null
          sell_price?: number | null
          stretch_sell_price?: number
          total_direct_cost?: number
          total_network_payout_cost?: number
          total_variable_cost?: number
          true_total_cost?: number
          updated_at?: string
        }
        Update: {
          break_even_price?: number
          carrier_buy_rate?: number | null
          collaboration_share?: number | null
          contribution_margin_percent?: number
          contribution_profit?: number
          created_at?: string
          fixed_cost_per_shipment?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          minimum_acceptable_sell_price?: number
          net_margin_percent?: number
          net_profit?: number
          network_share?: number | null
          platform_retained_profit?: number | null
          pricing_scenario_id?: string
          recommended_sell_price?: number
          referral_share?: number | null
          sell_price?: number | null
          stretch_sell_price?: number
          total_direct_cost?: number
          total_network_payout_cost?: number
          total_variable_cost?: number
          true_total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_outputs_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: true
            referencedRelation: "pricing_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean
          capacity_loose_adjustment: number
          capacity_normal_adjustment: number
          capacity_tight_adjustment: number
          company_id: string
          competition_high_adjustment: number
          competition_low_adjustment: number
          competition_normal_adjustment: number
          created_at: string
          high_volume_customer_adjustment: number
          id: string
          minimum_margin_percent: number
          shipment_type: string
          stretch_margin_percent: number
          target_margin_percent: number
          updated_at: string
          urgency_priority_adjustment: number
          urgency_standard_adjustment: number
          urgency_urgent_adjustment: number
        }
        Insert: {
          active?: boolean
          capacity_loose_adjustment?: number
          capacity_normal_adjustment?: number
          capacity_tight_adjustment?: number
          company_id: string
          competition_high_adjustment?: number
          competition_low_adjustment?: number
          competition_normal_adjustment?: number
          created_at?: string
          high_volume_customer_adjustment?: number
          id?: string
          minimum_margin_percent?: number
          shipment_type: string
          stretch_margin_percent?: number
          target_margin_percent?: number
          updated_at?: string
          urgency_priority_adjustment?: number
          urgency_standard_adjustment?: number
          urgency_urgent_adjustment?: number
        }
        Update: {
          active?: boolean
          capacity_loose_adjustment?: number
          capacity_normal_adjustment?: number
          capacity_tight_adjustment?: number
          company_id?: string
          competition_high_adjustment?: number
          competition_low_adjustment?: number
          competition_normal_adjustment?: number
          created_at?: string
          high_volume_customer_adjustment?: number
          id?: string
          minimum_margin_percent?: number
          shipment_type?: string
          stretch_margin_percent?: number
          target_margin_percent?: number
          updated_at?: string
          urgency_priority_adjustment?: number
          urgency_standard_adjustment?: number
          urgency_urgent_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_scenarios: {
        Row: {
          adjustment_percent: number | null
          approved_at: string | null
          approved_by_user_id: string | null
          base_margin_percent: number | null
          company_id: string
          created_at: string
          created_by_user_id: string
          final_margin_percent: number | null
          first_shipment_discount_amount: number | null
          id: string
          is_active: boolean
          is_selected: boolean
          manual_override: boolean
          minimum_margin_percent: number | null
          override_reason: string | null
          pricing_status: string
          scenario_name: string
          shipment_id: string
          shipment_type: string | null
          stretch_margin_percent: number | null
          updated_at: string
        }
        Insert: {
          adjustment_percent?: number | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          base_margin_percent?: number | null
          company_id: string
          created_at?: string
          created_by_user_id: string
          final_margin_percent?: number | null
          first_shipment_discount_amount?: number | null
          id?: string
          is_active?: boolean
          is_selected?: boolean
          manual_override?: boolean
          minimum_margin_percent?: number | null
          override_reason?: string | null
          pricing_status?: string
          scenario_name?: string
          shipment_id: string
          shipment_type?: string | null
          stretch_margin_percent?: number | null
          updated_at?: string
        }
        Update: {
          adjustment_percent?: number | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          base_margin_percent?: number | null
          company_id?: string
          created_at?: string
          created_by_user_id?: string
          final_margin_percent?: number | null
          first_shipment_discount_amount?: number | null
          id?: string
          is_active?: boolean
          is_selected?: boolean
          manual_override?: boolean
          minimum_margin_percent?: number | null
          override_reason?: string | null
          pricing_status?: string
          scenario_name?: string
          shipment_id?: string
          shipment_type?: string | null
          stretch_margin_percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_scenarios_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_scenarios_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          company_name: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          portfolio_urls: string[] | null
          role: string | null
          services: string[] | null
          social_links: Json | null
          tagline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          company_name?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          portfolio_urls?: string[] | null
          role?: string | null
          services?: string[] | null
          social_links?: Json | null
          tagline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          company_name?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          portfolio_urls?: string[] | null
          role?: string | null
          services?: string[] | null
          social_links?: Json | null
          tagline?: string | null
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
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
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
      revenue_split_rules: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          default_collaboration_percent: number
          default_platform_percent: number
          default_referral_percent: number
          id: string
          minimum_platform_retained_profit: number | null
          shipment_type: string | null
          split_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          default_collaboration_percent?: number
          default_platform_percent?: number
          default_referral_percent?: number
          id?: string
          minimum_platform_retained_profit?: number | null
          shipment_type?: string | null
          split_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          default_collaboration_percent?: number
          default_platform_percent?: number
          default_referral_percent?: number
          id?: string
          minimum_platform_retained_profit?: number | null
          shipment_type?: string | null
          split_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_split_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_split_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_split_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          collaboration_amount: number
          collaboration_percent: number
          created_at: string
          id: string
          margin_pool_amount: number
          network_amount: number
          network_percent: number
          platform_amount: number
          platform_percent: number
          pricing_scenario_id: string
          referral_amount: number
          referral_percent: number
          retained_platform_profit: number
          split_type: string
          updated_at: string
        }
        Insert: {
          collaboration_amount?: number
          collaboration_percent?: number
          created_at?: string
          id?: string
          margin_pool_amount?: number
          network_amount?: number
          network_percent?: number
          platform_amount?: number
          platform_percent?: number
          pricing_scenario_id: string
          referral_amount?: number
          referral_percent?: number
          retained_platform_profit?: number
          split_type?: string
          updated_at?: string
        }
        Update: {
          collaboration_amount?: number
          collaboration_percent?: number
          created_at?: string
          id?: string
          margin_pool_amount?: number
          network_amount?: number
          network_percent?: number
          platform_amount?: number
          platform_percent?: number
          pricing_scenario_id?: string
          referral_amount?: number
          referral_percent?: number
          retained_platform_profit?: number
          split_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: true
            referencedRelation: "pricing_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_bids: {
        Row: {
          amount: number
          bidder_company_id: string | null
          bidder_company_name: string | null
          bidder_user_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          rfq_id: string
          status: string
          transit_days: number | null
        }
        Insert: {
          amount: number
          bidder_company_id?: string | null
          bidder_company_name?: string | null
          bidder_user_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          rfq_id: string
          status?: string
          transit_days?: number | null
        }
        Update: {
          amount?: number
          bidder_company_id?: string | null
          bidder_company_name?: string | null
          bidder_user_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          rfq_id?: string
          status?: string
          transit_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_bids_bidder_company_id_fkey"
            columns: ["bidder_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_bidder_company_id_fkey"
            columns: ["bidder_company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_bidder_company_id_fkey"
            columns: ["bidder_company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_posts: {
        Row: {
          awarded_to: string | null
          cargo_type: string | null
          company_id: string | null
          company_name: string | null
          container_type: string | null
          created_at: string
          deadline: string | null
          description: string | null
          destination: string | null
          id: string
          origin: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          awarded_to?: string | null
          cargo_type?: string | null
          company_id?: string | null
          company_name?: string | null
          container_type?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          destination?: string | null
          id?: string
          origin?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          awarded_to?: string | null
          cargo_type?: string | null
          company_id?: string | null
          company_name?: string | null
          container_type?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          destination?: string | null
          id?: string
          origin?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_posts_awarded_to_fkey"
            columns: ["awarded_to"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_awarded_to_fkey"
            columns: ["awarded_to"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_awarded_to_fkey"
            columns: ["awarded_to"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sailing_reminders: {
        Row: {
          carrier: string
          container_type: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          destination_port: string
          email_sent: boolean
          etd: string | null
          id: string
          is_active: boolean
          is_triggered: boolean
          origin_port: string
          price_max: number | null
          price_min: number | null
          remind_at: string
          sailing_data: Json | null
          user_id: string
        }
        Insert: {
          carrier: string
          container_type?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          destination_port: string
          email_sent?: boolean
          etd?: string | null
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          origin_port: string
          price_max?: number | null
          price_min?: number | null
          remind_at: string
          sailing_data?: Json | null
          user_id: string
        }
        Update: {
          carrier?: string
          container_type?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          destination_port?: string
          email_sent?: boolean
          etd?: string | null
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          origin_port?: string
          price_max?: number | null
          price_min?: number | null
          remind_at?: string
          sailing_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      schedule_cutoffs: {
        Row: {
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          cutoff_datetime: string
          cutoff_type: string
          id: string
          location_id: string | null
          schedule_leg_id: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          cutoff_datetime: string
          cutoff_type: string
          id?: string
          location_id?: string | null
          schedule_leg_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          cutoff_datetime?: string
          cutoff_type?: string
          id?: string
          location_id?: string | null
          schedule_leg_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_cutoffs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_cutoffs_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_cutoffs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_cutoffs_schedule_leg_id_fkey"
            columns: ["schedule_leg_id"]
            isOneToOne: false
            referencedRelation: "schedule_legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_cutoffs_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_legs: {
        Row: {
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          discharge_location_id: string | null
          id: string
          leg_transit_time_days: number | null
          load_location_id: string | null
          planned_arrival: string | null
          planned_departure: string | null
          sequence_number: number
          service_code: string | null
          service_name: string | null
          source_message_id: string | null
          transport_mode: string | null
          updated_at: string
          vessel_id: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          discharge_location_id?: string | null
          id?: string
          leg_transit_time_days?: number | null
          load_location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          sequence_number?: number
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          transport_mode?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          discharge_location_id?: string | null
          id?: string
          leg_transit_time_days?: number | null
          load_location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          sequence_number?: number
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          transport_mode?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_legs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_legs_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_legs_discharge_location_id_fkey"
            columns: ["discharge_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_legs_load_location_id_fkey"
            columns: ["load_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_legs_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_legs_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_places: {
        Row: {
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          id: string
          location_id: string | null
          place_role: string
          sequence_number: number | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          place_role: string
          sequence_number?: number | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          place_role?: string
          sequence_number?: number | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_places_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_places_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_places_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_places_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_references: {
        Row: {
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          reference_type: string
          reference_value: string
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          reference_type: string
          reference_value: string
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          reference_type?: string
          reference_value?: string
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_references_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_references_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_references_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shipment_workspace_view"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_financials_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_messages: {
        Row: {
          attachment_json: Json | null
          company_id: string
          created_at: string
          id: string
          message_body: string
          sender_user_id: string
          shipment_id: string
          updated_at: string
          visibility_scope: string
        }
        Insert: {
          attachment_json?: Json | null
          company_id: string
          created_at?: string
          id?: string
          message_body: string
          sender_user_id: string
          shipment_id: string
          updated_at?: string
          visibility_scope?: string
        }
        Update: {
          attachment_json?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          message_body?: string
          sender_user_id?: string
          shipment_id?: string
          updated_at?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_messages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_messages_shipment_id_fkey"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
          alc_carrier_id: string | null
          assigned_by_user_id: string | null
          booking_id: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          issuance_id: string | null
          partner_id: string | null
          phone: string | null
          postal_code: string | null
          role: string
          role_type: string | null
          shipment_id: string
          shipping_instruction_id: string | null
          source_message_id: string | null
          state: string | null
          tax_id: string | null
          transport_document_id: string | null
        }
        Insert: {
          address?: string | null
          alc_carrier_id?: string | null
          assigned_by_user_id?: string | null
          booking_id?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          issuance_id?: string | null
          partner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          role: string
          role_type?: string | null
          shipment_id: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          state?: string | null
          tax_id?: string | null
          transport_document_id?: string | null
        }
        Update: {
          address?: string | null
          alc_carrier_id?: string | null
          assigned_by_user_id?: string | null
          booking_id?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          issuance_id?: string | null
          partner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          role_type?: string | null
          shipment_id?: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          state?: string | null
          tax_id?: string | null
          transport_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_parties_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_parties_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
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
            referencedRelation: "shipment_workspace_view"
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
          base_rate: number | null
          carrier: string | null
          carrier_rate_id: string | null
          company_id: string | null
          container_count: number
          container_type: string | null
          contract_number: string | null
          created_at: string
          currency: string
          destination_port: string | null
          free_time_days: number | null
          id: string
          is_selected: boolean
          markup_amount: number | null
          markup_percent: number | null
          mode: string | null
          notes: string | null
          origin_port: string | null
          rate_basis_type: string
          rate_per_container: number
          service_level: string | null
          shipment_id: string
          snapshot_taken_at: string | null
          surcharges: Json | null
          total_buy_rate: number | null
          total_freight: number
          trade_lane: string | null
          transit_days: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          base_rate?: number | null
          carrier?: string | null
          carrier_rate_id?: string | null
          company_id?: string | null
          container_count?: number
          container_type?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string
          destination_port?: string | null
          free_time_days?: number | null
          id?: string
          is_selected?: boolean
          markup_amount?: number | null
          markup_percent?: number | null
          mode?: string | null
          notes?: string | null
          origin_port?: string | null
          rate_basis_type?: string
          rate_per_container?: number
          service_level?: string | null
          shipment_id: string
          snapshot_taken_at?: string | null
          surcharges?: Json | null
          total_buy_rate?: number | null
          total_freight?: number
          trade_lane?: string | null
          transit_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          base_rate?: number | null
          carrier?: string | null
          carrier_rate_id?: string | null
          company_id?: string | null
          container_count?: number
          container_type?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string
          destination_port?: string | null
          free_time_days?: number | null
          id?: string
          is_selected?: boolean
          markup_amount?: number | null
          markup_percent?: number | null
          mode?: string | null
          notes?: string | null
          origin_port?: string | null
          rate_basis_type?: string
          rate_per_container?: number
          service_level?: string | null
          shipment_id?: string
          snapshot_taken_at?: string | null
          surcharges?: Json | null
          total_buy_rate?: number | null
          total_freight?: number
          trade_lane?: string | null
          transit_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_rates_carrier_rate_id_fkey"
            columns: ["carrier_rate_id"]
            isOneToOne: false
            referencedRelation: "carrier_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_rates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_rates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_references: {
        Row: {
          booking_id: string | null
          carrier_id: string | null
          created_at: string
          id: string
          is_primary: boolean
          issuance_id: string | null
          reference_type: string
          reference_value: string
          shipment_id: string
          shipping_instruction_id: string | null
          source_message_id: string | null
          transport_document_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          carrier_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          issuance_id?: string | null
          reference_type: string
          reference_value: string
          shipment_id: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          carrier_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          issuance_id?: string | null
          reference_type?: string
          reference_value?: string
          shipment_id?: string
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_references_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_references_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_services: {
        Row: {
          additional_services_json: Json | null
          created_at: string
          customs_clearance: boolean
          id: string
          insurance: boolean
          shipment_id: string
          special_handling: boolean
          trucking: boolean
          updated_at: string
          warehousing: boolean
        }
        Insert: {
          additional_services_json?: Json | null
          created_at?: string
          customs_clearance?: boolean
          id?: string
          insurance?: boolean
          shipment_id: string
          special_handling?: boolean
          trucking?: boolean
          updated_at?: string
          warehousing?: boolean
        }
        Update: {
          additional_services_json?: Json | null
          created_at?: string
          customs_clearance?: boolean
          id?: string
          insurance?: boolean
          shipment_id?: string
          special_handling?: boolean
          trucking?: boolean
          updated_at?: string
          warehousing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shipment_services_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_services_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_templates: {
        Row: {
          cargo: Json | null
          commodity: string | null
          container_count: number | null
          container_type: string | null
          created_at: string
          delivery_location: string | null
          description: string | null
          destination_port: string | null
          hs_code: string | null
          id: string
          incoterm: string | null
          last_used_at: string | null
          metadata: Json | null
          mode: string
          name: string
          origin_port: string | null
          parties: Json | null
          pickup_location: string | null
          shipment_type: string
          special_instructions: string | null
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          cargo?: Json | null
          commodity?: string | null
          container_count?: number | null
          container_type?: string | null
          created_at?: string
          delivery_location?: string | null
          description?: string | null
          destination_port?: string | null
          hs_code?: string | null
          id?: string
          incoterm?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          mode?: string
          name: string
          origin_port?: string | null
          parties?: Json | null
          pickup_location?: string | null
          shipment_type?: string
          special_instructions?: string | null
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          cargo?: Json | null
          commodity?: string | null
          container_count?: number | null
          container_type?: string | null
          created_at?: string
          delivery_location?: string | null
          description?: string | null
          destination_port?: string | null
          hs_code?: string | null
          id?: string
          incoterm?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          mode?: string
          name?: string
          origin_port?: string | null
          parties?: Json | null
          pickup_location?: string | null
          shipment_type?: string
          special_instructions?: string | null
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          accounting_information: string | null
          aircraft_type: string | null
          airline: string | null
          airport_of_departure: string | null
          airport_of_destination: string | null
          alc_carrier_id: string | null
          archived_at: string | null
          assigned_ops_user_id: string | null
          assigned_pricing_user_id: string | null
          ata: string | null
          atd: string | null
          available_for_pickup_date: string | null
          booking_confirmed_date: string | null
          booking_id: string | null
          booking_ref: string | null
          booking_terms: string | null
          capacity_condition: string | null
          cargo_arrival_date: string | null
          cargo_loaded_date: string | null
          cargo_received_date: string | null
          carrier: string | null
          carrier_submission_mode: string | null
          carrier_submission_status: string | null
          chargeable_weight: number | null
          commodity_item_number: string | null
          company_id: string | null
          competition_level: string | null
          container_count: number | null
          container_type: string | null
          containerized: boolean | null
          converted_from_quote_id: string | null
          created_at: string
          current_substatus: string | null
          customer_id: string | null
          customer_reference: string | null
          customer_type_snapshot: string | null
          customs_clearance_date: string | null
          cy_cutoff: string | null
          declared_value: number | null
          declared_value_for_carriage: number | null
          declared_value_for_customs: number | null
          delivered_date: string | null
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
          destination_location_id: string | null
          destination_port: string | null
          destuffing_required: boolean | null
          doc_cutoff: string | null
          erd: string | null
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
          is_first_shipment: boolean | null
          issuance_id: string | null
          lifecycle_stage: string | null
          mawb_number: string | null
          mode: string
          nature_and_quantity: string | null
          notes: string | null
          origin_location_id: string | null
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
          pod_location_id: string | null
          pol_location_id: string | null
          primary_reference_type: string | null
          primary_reference_value: string | null
          priority_level: string | null
          quote_reference: string | null
          rate_basis_type: string | null
          rate_class: string | null
          rate_per_container: number | null
          requested_ship_date: string | null
          routing_and_destination: string | null
          sci: string | null
          service_type: string | null
          shipment_ref: string
          shipment_type: string
          shipping_instruction_id: string | null
          si_cutoff: string | null
          space_confirmed: boolean | null
          status: string
          storage_notes: string | null
          total_freight: number | null
          total_shipment_value: number | null
          transport_document_id: string | null
          transshipment_port_1: string | null
          transshipment_port_2: string | null
          updated_at: string
          user_id: string
          vessel: string | null
          vessel_arrived_date: string | null
          vessel_departed_date: string | null
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
          alc_carrier_id?: string | null
          archived_at?: string | null
          assigned_ops_user_id?: string | null
          assigned_pricing_user_id?: string | null
          ata?: string | null
          atd?: string | null
          available_for_pickup_date?: string | null
          booking_confirmed_date?: string | null
          booking_id?: string | null
          booking_ref?: string | null
          booking_terms?: string | null
          capacity_condition?: string | null
          cargo_arrival_date?: string | null
          cargo_loaded_date?: string | null
          cargo_received_date?: string | null
          carrier?: string | null
          carrier_submission_mode?: string | null
          carrier_submission_status?: string | null
          chargeable_weight?: number | null
          commodity_item_number?: string | null
          company_id?: string | null
          competition_level?: string | null
          container_count?: number | null
          container_type?: string | null
          containerized?: boolean | null
          converted_from_quote_id?: string | null
          created_at?: string
          current_substatus?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          customer_type_snapshot?: string | null
          customs_clearance_date?: string | null
          cy_cutoff?: string | null
          declared_value?: number | null
          declared_value_for_carriage?: number | null
          declared_value_for_customs?: number | null
          delivered_date?: string | null
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
          destination_location_id?: string | null
          destination_port?: string | null
          destuffing_required?: boolean | null
          doc_cutoff?: string | null
          erd?: string | null
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
          is_first_shipment?: boolean | null
          issuance_id?: string | null
          lifecycle_stage?: string | null
          mawb_number?: string | null
          mode?: string
          nature_and_quantity?: string | null
          notes?: string | null
          origin_location_id?: string | null
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
          pod_location_id?: string | null
          pol_location_id?: string | null
          primary_reference_type?: string | null
          primary_reference_value?: string | null
          priority_level?: string | null
          quote_reference?: string | null
          rate_basis_type?: string | null
          rate_class?: string | null
          rate_per_container?: number | null
          requested_ship_date?: string | null
          routing_and_destination?: string | null
          sci?: string | null
          service_type?: string | null
          shipment_ref: string
          shipment_type?: string
          shipping_instruction_id?: string | null
          si_cutoff?: string | null
          space_confirmed?: boolean | null
          status?: string
          storage_notes?: string | null
          total_freight?: number | null
          total_shipment_value?: number | null
          transport_document_id?: string | null
          transshipment_port_1?: string | null
          transshipment_port_2?: string | null
          updated_at?: string
          user_id: string
          vessel?: string | null
          vessel_arrived_date?: string | null
          vessel_departed_date?: string | null
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
          alc_carrier_id?: string | null
          archived_at?: string | null
          assigned_ops_user_id?: string | null
          assigned_pricing_user_id?: string | null
          ata?: string | null
          atd?: string | null
          available_for_pickup_date?: string | null
          booking_confirmed_date?: string | null
          booking_id?: string | null
          booking_ref?: string | null
          booking_terms?: string | null
          capacity_condition?: string | null
          cargo_arrival_date?: string | null
          cargo_loaded_date?: string | null
          cargo_received_date?: string | null
          carrier?: string | null
          carrier_submission_mode?: string | null
          carrier_submission_status?: string | null
          chargeable_weight?: number | null
          commodity_item_number?: string | null
          company_id?: string | null
          competition_level?: string | null
          container_count?: number | null
          container_type?: string | null
          containerized?: boolean | null
          converted_from_quote_id?: string | null
          created_at?: string
          current_substatus?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          customer_type_snapshot?: string | null
          customs_clearance_date?: string | null
          cy_cutoff?: string | null
          declared_value?: number | null
          declared_value_for_carriage?: number | null
          declared_value_for_customs?: number | null
          delivered_date?: string | null
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
          destination_location_id?: string | null
          destination_port?: string | null
          destuffing_required?: boolean | null
          doc_cutoff?: string | null
          erd?: string | null
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
          is_first_shipment?: boolean | null
          issuance_id?: string | null
          lifecycle_stage?: string | null
          mawb_number?: string | null
          mode?: string
          nature_and_quantity?: string | null
          notes?: string | null
          origin_location_id?: string | null
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
          pod_location_id?: string | null
          pol_location_id?: string | null
          primary_reference_type?: string | null
          primary_reference_value?: string | null
          priority_level?: string | null
          quote_reference?: string | null
          rate_basis_type?: string | null
          rate_class?: string | null
          rate_per_container?: number | null
          requested_ship_date?: string | null
          routing_and_destination?: string | null
          sci?: string | null
          service_type?: string | null
          shipment_ref?: string
          shipment_type?: string
          shipping_instruction_id?: string | null
          si_cutoff?: string | null
          space_confirmed?: boolean | null
          status?: string
          storage_notes?: string | null
          total_freight?: number | null
          total_shipment_value?: number | null
          transport_document_id?: string | null
          transshipment_port_1?: string | null
          transshipment_port_2?: string | null
          updated_at?: string
          user_id?: string
          vessel?: string | null
          vessel_arrived_date?: string | null
          vessel_departed_date?: string | null
          vgm_cutoff?: string | null
          voyage?: string | null
          warehouse_location?: string | null
          warehouse_receipt_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_converted_from_quote_id_fkey"
            columns: ["converted_from_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_pod_location_id_fkey"
            columns: ["pod_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_pol_location_id_fkey"
            columns: ["pol_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instructions: {
        Row: {
          alc_carrier_id: string | null
          amendment_number: number | null
          booking_id: string | null
          created_at: string
          id: string
          issue_date: string | null
          shipment_id: string | null
          shipping_instruction_reference: string | null
          shipping_instruction_status: string | null
          source_message_id: string | null
          transport_document_type_code: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          amendment_number?: number | null
          booking_id?: string | null
          created_at?: string
          id?: string
          issue_date?: string | null
          shipment_id?: string | null
          shipping_instruction_reference?: string | null
          shipping_instruction_status?: string | null
          source_message_id?: string | null
          transport_document_type_code?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          amendment_number?: number | null
          booking_id?: string | null
          created_at?: string
          id?: string
          issue_date?: string | null
          shipment_id?: string | null
          shipping_instruction_reference?: string | null
          shipping_instruction_status?: string | null
          source_message_id?: string | null
          transport_document_type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instructions_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
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
            referencedRelation: "shipment_workspace_view"
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
      spark_event_rsvps: {
        Row: {
          company_name: string | null
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spark_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "spark_events"
            referencedColumns: ["id"]
          },
        ]
      }
      spark_events: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          is_virtual: boolean
          location: string | null
          rsvp_link: string | null
          title: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          is_virtual?: boolean
          location?: string | null
          rsvp_link?: string | null
          title: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          is_virtual?: boolean
          location?: string | null
          rsvp_link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spark_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spark_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spark_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          shipment_id: string | null
          status: string
          subject: string
          ticket_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          shipment_id?: string | null
          status?: string
          subject: string
          ticket_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          shipment_id?: string | null
          status?: string
          subject?: string
          ticket_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      surrender_code_mappings: {
        Row: {
          active: boolean
          alc_carrier_id: string | null
          code_type: string
          created_at: string
          description: string | null
          external_code: string
          external_name: string | null
          id: string
          internal_status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          alc_carrier_id?: string | null
          code_type: string
          created_at?: string
          description?: string | null
          external_code: string
          external_name?: string | null
          id?: string
          internal_status: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          alc_carrier_id?: string | null
          code_type?: string
          created_at?: string
          description?: string | null
          external_code?: string
          external_name?: string | null
          id?: string
          internal_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surrender_code_mappings_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      surrender_endorsement_chain: {
        Row: {
          action_code: string | null
          action_datetime: string | null
          actor_code_list_name: string | null
          actor_code_list_provider: string | null
          actor_ebl_platform: string | null
          actor_party_code: string | null
          actor_party_name: string | null
          actor_tax_reference_country: string | null
          actor_tax_reference_type: string | null
          actor_tax_reference_value: string | null
          alc_carrier_id: string | null
          created_at: string
          id: string
          recipient_code_list_name: string | null
          recipient_code_list_provider: string | null
          recipient_ebl_platform: string | null
          recipient_party_code: string | null
          recipient_party_name: string | null
          recipient_tax_reference_country: string | null
          recipient_tax_reference_type: string | null
          recipient_tax_reference_value: string | null
          sequence_number: number
          source_message_id: string | null
          surrender_request_id: string
          updated_at: string
        }
        Insert: {
          action_code?: string | null
          action_datetime?: string | null
          actor_code_list_name?: string | null
          actor_code_list_provider?: string | null
          actor_ebl_platform?: string | null
          actor_party_code?: string | null
          actor_party_name?: string | null
          actor_tax_reference_country?: string | null
          actor_tax_reference_type?: string | null
          actor_tax_reference_value?: string | null
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          recipient_code_list_name?: string | null
          recipient_code_list_provider?: string | null
          recipient_ebl_platform?: string | null
          recipient_party_code?: string | null
          recipient_party_name?: string | null
          recipient_tax_reference_country?: string | null
          recipient_tax_reference_type?: string | null
          recipient_tax_reference_value?: string | null
          sequence_number?: number
          source_message_id?: string | null
          surrender_request_id: string
          updated_at?: string
        }
        Update: {
          action_code?: string | null
          action_datetime?: string | null
          actor_code_list_name?: string | null
          actor_code_list_provider?: string | null
          actor_ebl_platform?: string | null
          actor_party_code?: string | null
          actor_party_name?: string | null
          actor_tax_reference_country?: string | null
          actor_tax_reference_type?: string | null
          actor_tax_reference_value?: string | null
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          recipient_code_list_name?: string | null
          recipient_code_list_provider?: string | null
          recipient_ebl_platform?: string | null
          recipient_party_code?: string | null
          recipient_party_name?: string | null
          recipient_tax_reference_country?: string | null
          recipient_tax_reference_type?: string | null
          recipient_tax_reference_value?: string | null
          sequence_number?: number
          source_message_id?: string | null
          surrender_request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surrender_endorsement_chain_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_endorsement_chain_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_endorsement_chain_surrender_request_id_fkey"
            columns: ["surrender_request_id"]
            isOneToOne: false
            referencedRelation: "surrender_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      surrender_errors: {
        Row: {
          alc_carrier_id: string | null
          created_at: string
          error_code: string | null
          error_code_text: string | null
          error_message: string | null
          id: string
          json_path: string | null
          property_name: string | null
          property_value: string | null
          source_message_id: string | null
          surrender_request_id: string
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          created_at?: string
          error_code?: string | null
          error_code_text?: string | null
          error_message?: string | null
          id?: string
          json_path?: string | null
          property_name?: string | null
          property_value?: string | null
          source_message_id?: string | null
          surrender_request_id: string
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          created_at?: string
          error_code?: string | null
          error_code_text?: string | null
          error_message?: string | null
          id?: string
          json_path?: string | null
          property_name?: string | null
          property_value?: string | null
          source_message_id?: string | null
          surrender_request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surrender_errors_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_errors_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_errors_surrender_request_id_fkey"
            columns: ["surrender_request_id"]
            isOneToOne: false
            referencedRelation: "surrender_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      surrender_requests: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string | null
          callback_received_at: string | null
          comments: string | null
          created_at: string
          id: string
          issuance_id: string | null
          reason_code: string | null
          request_submitted_at: string | null
          shipment_id: string | null
          shipping_instruction_id: string | null
          source_message_id: string | null
          surrender_request_code: string | null
          surrender_request_reference: string | null
          surrender_status_internal: string | null
          transport_document_id: string | null
          transport_document_reference: string | null
          transport_document_sub_reference: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          callback_received_at?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          issuance_id?: string | null
          reason_code?: string | null
          request_submitted_at?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          surrender_request_code?: string | null
          surrender_request_reference?: string | null
          surrender_status_internal?: string | null
          transport_document_id?: string | null
          transport_document_reference?: string | null
          transport_document_sub_reference?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          callback_received_at?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          issuance_id?: string | null
          reason_code?: string | null
          request_submitted_at?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          surrender_request_code?: string | null
          surrender_request_reference?: string | null
          surrender_status_internal?: string | null
          transport_document_id?: string | null
          transport_document_reference?: string | null
          transport_document_sub_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surrender_requests_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "issuance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_requests_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      surrender_responses: {
        Row: {
          alc_carrier_id: string | null
          callback_received_at: string | null
          created_at: string
          id: string
          response_status_internal: string | null
          source_message_id: string | null
          surrender_request_id: string
          surrender_response_code: string | null
          surrender_response_message: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          callback_received_at?: string | null
          created_at?: string
          id?: string
          response_status_internal?: string | null
          source_message_id?: string | null
          surrender_request_id: string
          surrender_response_code?: string | null
          surrender_response_message?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          callback_received_at?: string | null
          created_at?: string
          id?: string
          response_status_internal?: string | null
          source_message_id?: string | null
          surrender_request_id?: string
          surrender_response_code?: string | null
          surrender_response_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surrender_responses_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_responses_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surrender_responses_surrender_request_id_fkey"
            columns: ["surrender_request_id"]
            isOneToOne: false
            referencedRelation: "surrender_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_role: string | null
          assigned_to_user_id: string | null
          company_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_system: boolean
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string
          shipment_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_system?: boolean
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          shipment_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_system?: boolean
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          shipment_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_staff: boolean
          sender_id: string
          sender_name: string | null
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id: string
          sender_name?: string | null
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id?: string
          sender_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          alc_carrier_id: string | null
          created_at: string
          event_classifier_code: string | null
          event_created_datetime: string | null
          event_date: string
          event_payload_json: Json | null
          event_scope: string | null
          external_event_code: string | null
          external_event_name: string | null
          id: string
          internal_event_code: string | null
          internal_event_name: string | null
          location: string | null
          location_id: string | null
          milestone: string
          notes: string | null
          raw_event_code: string | null
          raw_message_id: string | null
          shipment_id: string
          source: string | null
          transport_call_id: string | null
          vessel_id: string | null
        }
        Insert: {
          alc_carrier_id?: string | null
          created_at?: string
          event_classifier_code?: string | null
          event_created_datetime?: string | null
          event_date?: string
          event_payload_json?: Json | null
          event_scope?: string | null
          external_event_code?: string | null
          external_event_name?: string | null
          id?: string
          internal_event_code?: string | null
          internal_event_name?: string | null
          location?: string | null
          location_id?: string | null
          milestone: string
          notes?: string | null
          raw_event_code?: string | null
          raw_message_id?: string | null
          shipment_id: string
          source?: string | null
          transport_call_id?: string | null
          vessel_id?: string | null
        }
        Update: {
          alc_carrier_id?: string | null
          created_at?: string
          event_classifier_code?: string | null
          event_created_datetime?: string | null
          event_date?: string
          event_payload_json?: Json | null
          event_scope?: string | null
          external_event_code?: string | null
          external_event_name?: string | null
          id?: string
          internal_event_code?: string | null
          internal_event_name?: string | null
          location?: string | null
          location_id?: string | null
          milestone?: string
          notes?: string | null
          raw_event_code?: string | null
          raw_message_id?: string | null
          shipment_id?: string
          source?: string | null
          transport_call_id?: string | null
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_raw_message_id_fkey"
            columns: ["raw_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_transport_call_fk"
            columns: ["transport_call_id"]
            isOneToOne: false
            referencedRelation: "transport_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_calls: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          carrier_id: string | null
          created_at: string
          facility_code: string | null
          id: string
          location_id: string | null
          planned_arrival: string | null
          planned_departure: string | null
          shipment_id: string | null
          transport_call_sequence: number | null
          updated_at: string
          vessel_id: string | null
          voyage_number: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          carrier_id?: string | null
          created_at?: string
          facility_code?: string | null
          id?: string
          location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          shipment_id?: string | null
          transport_call_sequence?: number | null
          updated_at?: string
          vessel_id?: string | null
          voyage_number?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          carrier_id?: string | null
          created_at?: string
          facility_code?: string | null
          id?: string
          location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          shipment_id?: string | null
          transport_call_sequence?: number | null
          updated_at?: string
          vessel_id?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_calls_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_calls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_calls_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_calls_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_calls_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_document_charges: {
        Row: {
          alc_carrier_id: string | null
          amount: number | null
          calculation_basis: string | null
          charge_code: string | null
          charge_description: string | null
          created_at: string
          currency_code: string | null
          id: string
          payment_term_code: string | null
          source_message_id: string | null
          transport_document_id: string
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          amount?: number | null
          calculation_basis?: string | null
          charge_code?: string | null
          charge_description?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          payment_term_code?: string | null
          source_message_id?: string | null
          transport_document_id: string
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          amount?: number | null
          calculation_basis?: string | null
          charge_code?: string | null
          charge_description?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          payment_term_code?: string | null
          source_message_id?: string | null
          transport_document_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_document_charges_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_charges_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_charges_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_document_consignment_items: {
        Row: {
          alc_carrier_id: string | null
          cargo_item_number: number | null
          consignment_item_number: number | null
          created_at: string
          description: string | null
          gross_weight: number | null
          harmonized_system_code: string | null
          id: string
          national_commodity_code: string | null
          net_weight: number | null
          package_quantity: number | null
          package_type_code: string | null
          source_message_id: string | null
          transport_document_id: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          alc_carrier_id?: string | null
          cargo_item_number?: number | null
          consignment_item_number?: number | null
          created_at?: string
          description?: string | null
          gross_weight?: number | null
          harmonized_system_code?: string | null
          id?: string
          national_commodity_code?: string | null
          net_weight?: number | null
          package_quantity?: number | null
          package_type_code?: string | null
          source_message_id?: string | null
          transport_document_id: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          alc_carrier_id?: string | null
          cargo_item_number?: number | null
          consignment_item_number?: number | null
          created_at?: string
          description?: string | null
          gross_weight?: number | null
          harmonized_system_code?: string | null
          id?: string
          national_commodity_code?: string | null
          net_weight?: number | null
          package_quantity?: number | null
          package_type_code?: string | null
          source_message_id?: string | null
          transport_document_id?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_document_consignment_items_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_consignment_items_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_consignment_items_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_document_equipments: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string | null
          container_number: string | null
          created_at: string
          dangerous_goods_flag: boolean | null
          equipment_reference: string | null
          equipment_type_code: string | null
          humidity_setting: string | null
          id: string
          iso_equipment_code: string | null
          overdimension_flag: boolean | null
          seal_number: string | null
          source_message_id: string | null
          temperature_setting: string | null
          transport_document_id: string
          updated_at: string
          ventilation_setting: string | null
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          container_number?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          equipment_reference?: string | null
          equipment_type_code?: string | null
          humidity_setting?: string | null
          id?: string
          iso_equipment_code?: string | null
          overdimension_flag?: boolean | null
          seal_number?: string | null
          source_message_id?: string | null
          temperature_setting?: string | null
          transport_document_id: string
          updated_at?: string
          ventilation_setting?: string | null
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string | null
          container_number?: string | null
          created_at?: string
          dangerous_goods_flag?: boolean | null
          equipment_reference?: string | null
          equipment_type_code?: string | null
          humidity_setting?: string | null
          id?: string
          iso_equipment_code?: string | null
          overdimension_flag?: boolean | null
          seal_number?: string | null
          source_message_id?: string | null
          temperature_setting?: string | null
          transport_document_id?: string
          updated_at?: string
          ventilation_setting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_document_equipments_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_equipments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_equipments_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_equipments_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_document_instructions: {
        Row: {
          alc_carrier_id: string | null
          created_at: string
          id: string
          instruction_text: string | null
          instruction_type: string | null
          source_message_id: string | null
          transport_document_id: string
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          instruction_text?: string | null
          instruction_type?: string | null
          source_message_id?: string | null
          transport_document_id: string
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          created_at?: string
          id?: string
          instruction_text?: string | null
          instruction_type?: string | null
          source_message_id?: string | null
          transport_document_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_document_instructions_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_instructions_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_instructions_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_documents: {
        Row: {
          alc_carrier_id: string | null
          bill_of_lading_number: string | null
          booking_id: string | null
          created_at: string
          declared_value: number | null
          declared_value_currency: string | null
          destination_charge_payment_term_code: string | null
          freight_payment_term_code: string | null
          id: string
          is_electronic: boolean | null
          is_surrendered: boolean | null
          issue_date: string | null
          issue_location_id: string | null
          number_of_copies: number | null
          number_of_originals: number | null
          origin_charge_payment_term_code: string | null
          received_for_shipment_date: string | null
          shipment_id: string | null
          shipped_on_board_date: string | null
          shipping_instruction_id: string | null
          source_message_id: string | null
          transport_document_reference: string | null
          transport_document_status: string | null
          transport_document_type_code: string | null
          updated_at: string
        }
        Insert: {
          alc_carrier_id?: string | null
          bill_of_lading_number?: string | null
          booking_id?: string | null
          created_at?: string
          declared_value?: number | null
          declared_value_currency?: string | null
          destination_charge_payment_term_code?: string | null
          freight_payment_term_code?: string | null
          id?: string
          is_electronic?: boolean | null
          is_surrendered?: boolean | null
          issue_date?: string | null
          issue_location_id?: string | null
          number_of_copies?: number | null
          number_of_originals?: number | null
          origin_charge_payment_term_code?: string | null
          received_for_shipment_date?: string | null
          shipment_id?: string | null
          shipped_on_board_date?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_reference?: string | null
          transport_document_status?: string | null
          transport_document_type_code?: string | null
          updated_at?: string
        }
        Update: {
          alc_carrier_id?: string | null
          bill_of_lading_number?: string | null
          booking_id?: string | null
          created_at?: string
          declared_value?: number | null
          declared_value_currency?: string | null
          destination_charge_payment_term_code?: string | null
          freight_payment_term_code?: string | null
          id?: string
          is_electronic?: boolean | null
          is_surrendered?: boolean | null
          issue_date?: string | null
          issue_location_id?: string | null
          number_of_copies?: number | null
          number_of_originals?: number | null
          origin_charge_payment_term_code?: string | null
          received_for_shipment_date?: string | null
          shipment_id?: string | null
          shipped_on_board_date?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_reference?: string | null
          transport_document_status?: string | null
          transport_document_type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_documents_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_issue_location_id_fkey"
            columns: ["issue_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_documents_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_plans: {
        Row: {
          alc_carrier_id: string | null
          booking_id: string
          created_at: string
          discharge_location_id: string | null
          id: string
          load_location_id: string | null
          place_of_delivery_location_id: string | null
          place_of_receipt_location_id: string | null
          planned_arrival: string | null
          planned_departure: string | null
          sequence_number: number | null
          service_name: string | null
          shipment_id: string | null
          shipping_instruction_id: string | null
          source_message_id: string | null
          transport_document_id: string | null
          transport_mode: string | null
          updated_at: string
          vessel_id: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          alc_carrier_id?: string | null
          booking_id: string
          created_at?: string
          discharge_location_id?: string | null
          id?: string
          load_location_id?: string | null
          place_of_delivery_location_id?: string | null
          place_of_receipt_location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          sequence_number?: number | null
          service_name?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          transport_mode?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          alc_carrier_id?: string | null
          booking_id?: string
          created_at?: string
          discharge_location_id?: string | null
          id?: string
          load_location_id?: string | null
          place_of_delivery_location_id?: string | null
          place_of_receipt_location_id?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          sequence_number?: number | null
          service_name?: string | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          source_message_id?: string | null
          transport_document_id?: string | null
          transport_mode?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_plans_alc_carrier_id_fkey"
            columns: ["alc_carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_discharge_location_id_fkey"
            columns: ["discharge_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_load_location_id_fkey"
            columns: ["load_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_place_of_delivery_location_id_fkey"
            columns: ["place_of_delivery_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_place_of_receipt_location_id_fkey"
            columns: ["place_of_receipt_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shipment_workspace_view"
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
      vessel_schedules: {
        Row: {
          carrier_id: string | null
          commercial_schedule_id: string
          created_at: string
          final_arrival_datetime: string | null
          first_departure_datetime: string | null
          first_port_location_id: string | null
          id: string
          last_port_location_id: string | null
          service_code: string | null
          service_name: string | null
          source_message_id: string | null
          updated_at: string
          vessel_id: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          carrier_id?: string | null
          commercial_schedule_id: string
          created_at?: string
          final_arrival_datetime?: string | null
          first_departure_datetime?: string | null
          first_port_location_id?: string | null
          id?: string
          last_port_location_id?: string | null
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          carrier_id?: string | null
          commercial_schedule_id?: string
          created_at?: string
          final_arrival_datetime?: string | null
          first_departure_datetime?: string | null
          first_port_location_id?: string | null
          id?: string
          last_port_location_id?: string | null
          service_code?: string | null
          service_name?: string | null
          source_message_id?: string | null
          updated_at?: string
          vessel_id?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vessel_schedules_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "alc_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_commercial_schedule_id_fkey"
            columns: ["commercial_schedule_id"]
            isOneToOne: false
            referencedRelation: "commercial_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_first_port_location_id_fkey"
            columns: ["first_port_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_last_port_location_id_fkey"
            columns: ["last_port_location_id"]
            isOneToOne: false
            referencedRelation: "alc_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "carrier_raw_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "alc_vessels"
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shipment_workspace_view"
            referencedColumns: ["id"]
          },
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
      workflow_config: {
        Row: {
          company_id: string
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
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
      customer_summary_view: {
        Row: {
          active_shipments: number | null
          company_name: string | null
          company_type: string | null
          created_at: string | null
          id: string | null
          shipment_count: number | null
          status: Database["public"]["Enums"]["company_status"] | null
          user_id: string | null
        }
        Insert: {
          active_shipments?: never
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string | null
          shipment_count?: never
          status?: Database["public"]["Enums"]["company_status"] | null
          user_id?: string | null
        }
        Update: {
          active_shipments?: never
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string | null
          shipment_count?: never
          status?: Database["public"]["Enums"]["company_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      shipment_workspace_view: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          customer_id: string | null
          destination_port: string | null
          doc_count: number | null
          eta: string | null
          etd: string | null
          id: string | null
          latest_milestone: string | null
          lifecycle_stage: string | null
          mode: string | null
          net_margin_percent: number | null
          net_profit: number | null
          origin_port: string | null
          pending_doc_count: number | null
          recommended_sell_price: number | null
          shipment_ref: string | null
          shipment_type: string | null
          status: string | null
          true_total_cost: number | null
          updated_at: string | null
          user_id: string | null
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
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "company_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_edit_shipment: { Args: { _shipment_id: string }; Returns: boolean }
      can_view_shipment: { Args: { _shipment_id: string }; Returns: boolean }
      get_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["company_role"]
      }
      get_customer_visible_shipment_ids: { Args: never; Returns: string[] }
      get_user_company_ids: { Args: never; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_company_role: {
        Args: { _allowed_roles: string[]; _company_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      resolve_shipment_reference: {
        Args: { _query: string }
        Returns: {
          carrier_code: string
          destination_port: string
          match_type: string
          origin_port: string
          reference_type: string
          reference_value: string
          shipment_id: string
          shipment_ref: string
          status: string
        }[]
      }
      scenario_company_id: { Args: { _scenario_id: string }; Returns: string }
      shipment_company_id: { Args: { _shipment_id: string }; Returns: string }
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
        | "forwarder"
      company_role:
        | "admin"
        | "pricing_manager"
        | "operations_manager"
        | "sales_manager"
        | "customer_user"
        | "finance_user"
        | "partner_user"
        | "viewer"
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
        "forwarder",
      ],
      company_role: [
        "admin",
        "pricing_manager",
        "operations_manager",
        "sales_manager",
        "customer_user",
        "finance_user",
        "partner_user",
        "viewer",
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
