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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      contract_equipment: {
        Row: {
          contract_id: string
          coverage: unknown
          created_at: string
          equipment_id: string
          is_binding: boolean
        }
        Insert: {
          contract_id: string
          coverage: unknown
          created_at?: string
          equipment_id: string
          is_binding?: boolean
        }
        Update: {
          contract_id?: string
          coverage?: unknown
          created_at?: string
          equipment_id?: string
          is_binding?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_availability"
            referencedColumns: ["equipment_id"]
          },
        ]
      }
      contracts: {
        Row: {
          activated_at: string | null
          annual_value_eur: number
          auto_renew: boolean
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string
          id: string
          notes: string | null
          notice_period_days: number
          pdf_path: string | null
          preventive_visits_per_year: number
          previous_contract_id: string | null
          sla_p1_hours: number
          sla_p2_hours: number
          sla_p3_hours: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          terminated_on: string | null
          termination_reason: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          annual_value_eur: number
          auto_renew?: boolean
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date: string
          id?: string
          notes?: string | null
          notice_period_days?: number
          pdf_path?: string | null
          preventive_visits_per_year?: number
          previous_contract_id?: string | null
          sla_p1_hours: number
          sla_p2_hours: number
          sla_p3_hours: number
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          terminated_on?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          annual_value_eur?: number
          auto_renew?: boolean
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          contract_number?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          notice_period_days?: number
          pdf_path?: string | null
          preventive_visits_per_year?: number
          previous_contract_id?: string | null
          sla_p1_hours?: number
          sla_p2_hours?: number
          sla_p3_hours?: number
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          terminated_on?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_number: string
          id: string
          is_active: boolean
          is_demo: boolean
          name: string
          notes: string | null
          segment: Database["public"]["Enums"]["customer_segment"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_number?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name: string
          notes?: string | null
          segment: Database["public"]["Enums"]["customer_segment"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_number?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name?: string
          notes?: string | null
          segment?: Database["public"]["Enums"]["customer_segment"]
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          cooling_capacity_kw: number
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          install_date: string
          manufacturer: string
          model: string
          notes: string | null
          serial_number: string
          site_id: string
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
          warranty_end_date: string | null
        }
        Insert: {
          cooling_capacity_kw: number
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          install_date: string
          manufacturer: string
          model: string
          notes?: string | null
          serial_number: string
          site_id: string
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Update: {
          cooling_capacity_kw?: number
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          install_date?: string
          manufacturer?: string
          model?: string
          notes?: string | null
          serial_number?: string
          site_id?: string
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_visits: {
        Row: {
          actual_date: string | null
          assigned_technician_id: string | null
          contract_id: string
          created_at: string
          due_date: string
          id: string
          observations: string | null
          result: Database["public"]["Enums"]["visit_result"] | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
          visit_number: number
        }
        Insert: {
          actual_date?: string | null
          assigned_technician_id?: string | null
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          observations?: string | null
          result?: Database["public"]["Enums"]["visit_result"] | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_number: number
        }
        Update: {
          actual_date?: string | null
          assigned_technician_id?: string | null
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          observations?: string | null
          result?: Database["public"]["Enums"]["visit_result"] | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "preventive_visits_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          assigned_technician_id: string | null
          covering_contract_id: string | null
          created_at: string
          created_by: string | null
          description: string
          equipment_id: string
          failure_end: string | null
          failure_start: string | null
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          reported_at: string
          reported_by_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          sla_hours: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_technician_id?: string | null
          covering_contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          equipment_id: string
          failure_end?: string | null
          failure_start?: string | null
          first_response_at?: string | null
          id?: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          reported_at?: string
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          assigned_technician_id?: string | null
          covering_contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          equipment_id?: string
          failure_end?: string | null
          failure_start?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reported_at?: string
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_availability"
            referencedColumns: ["equipment_id"]
          },
        ]
      }
      sites: {
        Row: {
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          name: string
          postal_code: string
          street: string
          updated_at: string
        }
        Insert: {
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          name: string
          postal_code: string
          street: string
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_code?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_alerts: {
        Row: {
          alert_type: string | null
          customer_name: string | null
          due_date: string | null
          entity_id: string | null
          reference: string | null
          severity: string | null
          technician_id: string | null
          title: string | null
        }
        Relationships: []
      }
      v_audit_log: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          id: number | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Relationships: []
      }
      v_contracts: {
        Row: {
          activated_at: string | null
          annual_value_eur: number | null
          auto_renew: boolean | null
          billing_frequency:
            | Database["public"]["Enums"]["billing_frequency"]
            | null
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          days_to_decision: number | null
          decision_deadline: string | null
          display_status: string | null
          end_date: string | null
          equipment_count: number | null
          id: string | null
          is_in_force: boolean | null
          next_contract_id: string | null
          next_contract_number: string | null
          notes: string | null
          notice_period_days: number | null
          pdf_path: string | null
          preventive_visits_per_year: number | null
          previous_contract_id: string | null
          previous_contract_number: string | null
          sla_p1_hours: number | null
          sla_p2_hours: number | null
          sla_p3_hours: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          terminated_on: string | null
          termination_reason: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: true
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_summary: {
        Row: {
          active_contracts: number | null
          annual_value_eur: number | null
          availability_90d: number | null
          billable_tickets_90d: number | null
          covered_equipment_count: number | null
          customer_number: string | null
          equipment_count: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          open_tickets: number | null
          overdue_visits: number | null
          segment: Database["public"]["Enums"]["customer_segment"] | null
          sites_count: number | null
          sla_met_pct_90d: number | null
        }
        Insert: {
          active_contracts?: never
          annual_value_eur?: never
          availability_90d?: never
          billable_tickets_90d?: never
          covered_equipment_count?: never
          customer_number?: string | null
          equipment_count?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_tickets?: never
          overdue_visits?: never
          segment?: Database["public"]["Enums"]["customer_segment"] | null
          sites_count?: never
          sla_met_pct_90d?: never
        }
        Update: {
          active_contracts?: never
          annual_value_eur?: never
          availability_90d?: never
          billable_tickets_90d?: never
          covered_equipment_count?: never
          customer_number?: string | null
          equipment_count?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_tickets?: never
          overdue_visits?: never
          segment?: Database["public"]["Enums"]["customer_segment"] | null
          sites_count?: never
          sla_met_pct_90d?: never
        }
        Relationships: []
      }
      v_dashboard_kpis: {
        Row: {
          active_contracts: number | null
          availability_90d: number | null
          billable_tickets_90d: number | null
          covered_equipment_count: number | null
          equipment_count: number | null
          open_tickets_p1: number | null
          open_tickets_p2: number | null
          open_tickets_p3: number | null
          overdue_decisions_count: number | null
          overdue_decisions_value_eur: number | null
          overdue_visits: number | null
          plan_compliance_pct_12m: number | null
          portfolio_annual_value_eur: number | null
          renewals_90d_count: number | null
          renewals_90d_value_eur: number | null
          sla_met_pct_90d: number | null
        }
        Relationships: []
      }
      v_equipment: {
        Row: {
          city: string | null
          cooling_capacity_kw: number | null
          created_at: string | null
          current_contract_id: string | null
          current_contract_number: string | null
          customer_id: string | null
          customer_name: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          id: string | null
          in_warranty: boolean | null
          install_date: string | null
          is_covered: boolean | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          serial_number: string | null
          site_id: string | null
          site_name: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          updated_at: string | null
          warranty_end_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["current_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["current_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["current_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["current_contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      v_equipment_availability: {
        Row: {
          availability_90d: number | null
          customer_id: string | null
          customer_name: string | null
          downtime_hours_90d: number | null
          equipment_id: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          serial_number: string | null
          site_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      v_preventive_visits: {
        Row: {
          actual_date: string | null
          assigned_technician_id: string | null
          contract_id: string | null
          contract_number: string | null
          counts_for_compliance: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          done_on_time: boolean | null
          due_date: string | null
          equipment_count: number | null
          id: string | null
          is_overdue: boolean | null
          observations: string | null
          planned_date: string | null
          result: Database["public"]["Enums"]["visit_result"] | null
          scheduled_date: string | null
          sites: string | null
          status: Database["public"]["Enums"]["visit_status"] | null
          technician_name: string | null
          updated_at: string | null
          visit_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "preventive_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      v_renewal_pipeline: {
        Row: {
          annual_value_eur: number | null
          auto_renew: boolean | null
          bucket: string | null
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          customer_id: string | null
          customer_name: string | null
          days_to_decision: number | null
          decision_deadline: string | null
          end_date: string | null
          id: string | null
          notice_period_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      v_service_requests: {
        Row: {
          assigned_technician_id: string | null
          city: string | null
          covering_contract_id: string | null
          covering_contract_number: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          description: string | null
          equipment_id: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          failure_end: string | null
          failure_start: string | null
          first_response_at: string | null
          id: string | null
          is_billable: boolean | null
          manufacturer: string | null
          model: string | null
          postal_code: string | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          reported_at: string | null
          reported_by_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          response_hours: number | null
          serial_number: string | null
          site_id: string | null
          site_name: string | null
          sla_due_at: string | null
          sla_hours: number | null
          sla_status: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          street: string | null
          technician_name: string | null
          ticket_number: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts"
            referencedColumns: ["next_contract_id"]
          },
          {
            foreignKeyName: "service_requests_covering_contract_id_fkey"
            columns: ["covering_contract_id"]
            isOneToOne: false
            referencedRelation: "v_renewal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_availability"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_contract: {
        Args: { p_contract_id: string }
        Returns: {
          activated_at: string | null
          annual_value_eur: number
          auto_renew: boolean
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string
          id: string
          notes: string | null
          notice_period_days: number
          pdf_path: string | null
          preventive_visits_per_year: number
          previous_contract_id: string | null
          sla_p1_hours: number
          sla_p2_hours: number
          sla_p3_hours: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          terminated_on: string | null
          termination_reason: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_contracts: { Args: never; Returns: number }
      health_check: { Args: never; Returns: Json }
      renew_contract: {
        Args: {
          p_annual_value_eur?: number
          p_contract_id: string
          p_duration_months?: number
          p_new_contract_number?: string
        }
        Returns: {
          activated_at: string | null
          annual_value_eur: number
          auto_renew: boolean
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string
          id: string
          notes: string | null
          notice_period_days: number
          pdf_path: string | null
          preventive_visits_per_year: number
          previous_contract_id: string | null
          sla_p1_hours: number
          sla_p2_hours: number
          sla_p3_hours: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          terminated_on: string | null
          termination_reason: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      terminate_contract: {
        Args: {
          p_contract_id: string
          p_reason: string
          p_terminated_on: string
        }
        Returns: {
          activated_at: string | null
          annual_value_eur: number
          auto_renew: boolean
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string
          id: string
          notes: string | null
          notice_period_days: number
          pdf_path: string | null
          preventive_visits_per_year: number
          previous_contract_id: string | null
          sla_p1_hours: number
          sla_p2_hours: number
          sla_p3_hours: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          terminated_on: string | null
          termination_reason: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      billing_frequency: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL"
      contract_status: "DRAFT" | "ACTIVE" | "EXPIRED" | "RENEWED" | "TERMINATED"
      contract_type: "FULL_SERVICE" | "PREVENTIVE" | "ON_CALL"
      customer_segment:
        | "OFFICE"
        | "CLINIC"
        | "HOTEL"
        | "RETAIL"
        | "SCHOOL"
        | "SERVER_ROOM"
        | "OTHER"
      equipment_status: "ACTIVE" | "DECOMMISSIONED"
      equipment_type:
        | "SPLIT_AC"
        | "MULTI_SPLIT"
        | "HEAT_PUMP"
        | "VENTILATION"
        | "CHILLER"
      ticket_priority: "P1" | "P2" | "P3"
      ticket_status: "OPEN" | "RESOLVED" | "CANCELLED"
      user_role: "manager" | "coordinator" | "technician" | "viewer"
      visit_result: "OK" | "ISSUES_FOUND" | "FOLLOW_UP_REQUIRED"
      visit_status: "PLANNED" | "DONE" | "CANCELLED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      billing_frequency: ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"],
      contract_status: ["DRAFT", "ACTIVE", "EXPIRED", "RENEWED", "TERMINATED"],
      contract_type: ["FULL_SERVICE", "PREVENTIVE", "ON_CALL"],
      customer_segment: [
        "OFFICE",
        "CLINIC",
        "HOTEL",
        "RETAIL",
        "SCHOOL",
        "SERVER_ROOM",
        "OTHER",
      ],
      equipment_status: ["ACTIVE", "DECOMMISSIONED"],
      equipment_type: [
        "SPLIT_AC",
        "MULTI_SPLIT",
        "HEAT_PUMP",
        "VENTILATION",
        "CHILLER",
      ],
      ticket_priority: ["P1", "P2", "P3"],
      ticket_status: ["OPEN", "RESOLVED", "CANCELLED"],
      user_role: ["manager", "coordinator", "technician", "viewer"],
      visit_result: ["OK", "ISSUES_FOUND", "FOLLOW_UP_REQUIRED"],
      visit_status: ["PLANNED", "DONE", "CANCELLED"],
    },
  },
} as const
