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
      attendance_records: {
        Row: {
          id: string
          user_id: string
          clock_in: string | null
          clock_out: string | null
          date: string
          status: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          clock_in?: string | null
          clock_out?: string | null
          date?: string
          status?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          clock_in?: string | null
          clock_out?: string | null
          date?: string
          status?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      budgets: {
        Row: {
          actual_amount: number
          budgeted_amount: number
          category: string
          created_at: string
          id: string
          quarter: number
          year: number
        }
        Insert: {
          actual_amount?: number
          budgeted_amount?: number
          category: string
          created_at?: string
          id?: string
          quarter: number
          year: number
        }
        Update: {
          actual_amount?: number
          budgeted_amount?: number
          category?: string
          created_at?: string
          id?: string
          quarter?: number
          year?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          assigned_to: string | null
          company: string | null
          created_at: string
          created_by: string | null
          deal_status: string
          email: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deal_status?: string
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deal_status?: string
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string | null
          user_id: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string | null
          user_id?: string | null
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string | null
          user_id?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      leave_balances: {
        Row: {
          id: string
          user_id: string
          leave_type: string
          total_days: number
          used_days: number
          year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type: string
          total_days?: number
          used_days?: number
          year: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leave_type?: string
          total_days?: number
          used_days?: number
          year?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          role: string
          performance_score: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id: string
          role?: string
          performance_score?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          role?: string
          performance_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          blocker_notes: Json | null
          client_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          priority: string
          recurrence_pattern: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          blocker_notes?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          priority?: string
          recurrence_pattern?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          blocker_notes?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          priority?: string
          recurrence_pattern?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_updates: {
        Row: {
          id: string
          task_id: string | null
          user_id: string | null
          action: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          action: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          action?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          amount: number
          type: string
          category: string
          date: string
          description: string | null
          created_by: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          amount: number
          type: string
          category: string
          date: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          amount?: number
          type?: string
          category?: string
          date?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          name: string
          type: string
          size: string | null
          url: string | null
          folder_id: string | null
          department: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          size?: string | null
          url?: string | null
          folder_id?: string | null
          department?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          size?: string | null
          url?: string | null
          folder_id?: string | null
          department?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          }
        ]
      }
      ops_metrics: {
        Row: {
          id: string
          deliveries: number
          issues: number
          date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deliveries?: number
          issues?: number
          date: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deliveries?: number
          issues?: number
          date?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          id: string
          amount: number
          category: string
          description: string | null
          requested_by: string | null
          approved_by: string | null
          status: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          amount: number
          category: string
          description?: string | null
          requested_by?: string | null
          approved_by?: string | null
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          amount?: number
          category?: string
          description?: string | null
          requested_by?: string | null
          approved_by?: string | null
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      social_posts: {
        Row: {
          id: string
          content: string
          platform: string
          status: string
          scheduled_date: string | null
          likes: number | null
          shares: number | null
          comments: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          platform: string
          status: string
          scheduled_date?: string | null
          likes?: number | null
          shares?: number | null
          comments?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          platform?: string
          status?: string
          scheduled_date?: string | null
          likes?: number | null
          shares?: number | null
          comments?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
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
