export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          company_name: string
          founder_name: string
          name: string
          status: string
          contract_end: string | null
          tags: Json | null
          total_amount: number | null
          is_archived: boolean
          founder_id: string | null
          current_phase: number
          industry: string | null
          notes: string | null
          stripe_customer_id: string | null
          stripe_account_id: string | null
          mrr_amount: number | null
          voice_form_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          founder_name: string
          name?: string
          status?: string
          contract_end?: string | null
          tags?: Json | null
          total_amount?: number | null
          is_archived?: boolean
          founder_id?: string | null
          current_phase?: number
          industry?: string | null
          notes?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          mrr_amount?: number | null
          voice_form_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          founder_name?: string
          name?: string
          status?: string
          contract_end?: string | null
          tags?: Json | null
          total_amount?: number | null
          is_archived?: boolean
          founder_id?: string | null
          current_phase?: number
          industry?: string | null
          notes?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          mrr_amount?: number | null
          voice_form_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outlines: {
        Row: {
          id: string
          project_id: string
          content: string
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          content: string
          approved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          content?: string
          approved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          id: string
          project_id: string
          user_id: string
          content: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          content: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          id: string
          project_id: string
          report_type: string
          content: string
          approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          report_type: string
          content: string
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          report_type?: string
          content?: string
          approved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          project_id: string
          amount: number
          currency: string
          status: string
          stripe_payment_id: string | null
          description: string | null
          seen: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          amount: number
          currency?: string
          status?: string
          stripe_payment_id?: string | null
          description?: string | null
          seen?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          amount?: number
          currency?: string
          status?: string
          stripe_payment_id?: string | null
          description?: string | null
          seen?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_responses: {
        Row: {
          id: string
          project_id: string | null
          form_id: string | null
          question: string | null
          respondent_name: string | null
          respondent_email: string | null
          audio_url: string | null
          transcript: string | null
          transcript_edited: boolean | null
          submitted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          form_id?: string | null
          question?: string | null
          respondent_name?: string | null
          respondent_email?: string | null
          audio_url?: string | null
          transcript?: string | null
          transcript_edited?: boolean | null
          submitted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          form_id?: string | null
          question?: string | null
          respondent_name?: string | null
          respondent_email?: string | null
          audio_url?: string | null
          transcript?: string | null
          transcript_edited?: boolean | null
          submitted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "voice_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_forms: {
        Row: {
          id: string
          project_id: string
          title: string
          respondent_type: string
          share_token: string
          is_open: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          respondent_type: string
          share_token?: string
          is_open?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          respondent_type?: string
          share_token?: string
          is_open?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          id: string
          project_id: string
          name: string
          email: string | null
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          email?: string | null
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          email?: string | null
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string
          meeting_date: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          content: string
          meeting_date: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string
          meeting_date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
