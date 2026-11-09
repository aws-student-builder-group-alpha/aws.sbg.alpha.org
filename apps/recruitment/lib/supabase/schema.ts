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
      alpha_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          object_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          object_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          object_id?: string
        }
        Relationships: []
      }
      alpha_members: {
        Row: {
          application_id: string | null
          created_at: string
          full_name: string
          id: string
          joined_on: string
          owner_id: string
          photo_path: string | null
          position: string
          status: string
          version: number
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          joined_on: string
          owner_id: string
          photo_path?: string | null
          position: string
          status?: string
          version?: number
        }
        Update: {
          application_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          joined_on?: string
          owner_id?: string
          photo_path?: string | null
          position?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "alpha_members_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_membership_history: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          joined_on: string
          member_id: string
          position: string
          reason: string
          status: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          joined_on: string
          member_id: string
          position: string
          reason: string
          status: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          joined_on?: string
          member_id?: string
          position?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_membership_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "alpha_members"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_drafts: {
        Row: {
          consented_at: string
          created_at: string
          data: Json
          email: string
          id: string
          last_mutation_id: string
          owner_id: string
          privacy_version: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          consented_at?: string
          created_at?: string
          data: Json
          email: string
          id?: string
          last_mutation_id: string
          owner_id: string
          privacy_version?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          consented_at?: string
          created_at?: string
          data?: Json
          email?: string
          id?: string
          last_mutation_id?: string
          owner_id?: string
          privacy_version?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      applicant_messages: {
        Row: {
          actor_id: string
          application_id: string
          body: string
          calendly_url: string | null
          completed_at: string | null
          created_at: string
          id: string
          kind: string
          recipient: string
          request: Json
          state: string
          subject: string
        }
        Insert: {
          actor_id: string
          application_id: string
          body: string
          calendly_url?: string | null
          completed_at?: string | null
          created_at?: string
          id: string
          kind: string
          recipient: string
          request: Json
          state?: string
          subject: string
        }
        Update: {
          actor_id?: string
          application_id?: string
          body?: string
          calendly_url?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          recipient?: string
          request?: Json
          state?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_notifications: {
        Row: {
          application_id: string
          body: string
          created_at: string
          event_key: string
          id: string
          kind: string
          link: string | null
          owner_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          event_key: string
          id?: string
          kind: string
          link?: string | null
          owner_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          event_key?: string
          id?: string
          kind?: string
          link?: string | null
          owner_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_public_history: {
        Row: {
          application_id: string
          created_at: string
          status: string
          version: number
        }
        Insert: {
          application_id: string
          created_at?: string
          status: string
          version: number
        }
        Update: {
          application_id?: string
          created_at?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_public_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          consented_at: string
          data: Json
          email: string
          id: string
          owner_id: string
          privacy_version: string
          reference: string
          source_draft_version: number
          status: string
          submit_mutation_id: string
          submitted_at: string
          version: number
          withdraw_mutation_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consented_at: string
          data: Json
          email: string
          id?: string
          owner_id: string
          privacy_version: string
          reference: string
          source_draft_version: number
          status?: string
          submit_mutation_id: string
          submitted_at?: string
          version?: number
          withdraw_mutation_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consented_at?: string
          data?: Json
          email?: string
          id?: string
          owner_id?: string
          privacy_version?: string
          reference?: string
          source_draft_version?: number
          status?: string
          submit_mutation_id?: string
          submitted_at?: string
          version?: number
          withdraw_mutation_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      decision_commands: {
        Row: {
          actor_id: string
          application_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Insert: {
          actor_id: string
          application_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Update: {
          actor_id?: string
          application_id?: string
          mutation_id?: string
          request_hash?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "decision_commands_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_history: {
        Row: {
          action: string
          actor_id: string
          application_id: string
          application_version: number
          assignment_id: string
          created_at: string
          id: string
          outcome: string
          previous_status: string
          reason: string
          review_version: number
        }
        Insert: {
          action: string
          actor_id: string
          application_id: string
          application_version: number
          assignment_id: string
          created_at?: string
          id?: string
          outcome: string
          previous_status: string
          reason: string
          review_version: number
        }
        Update: {
          action?: string
          actor_id?: string
          application_id?: string
          application_version?: number
          assignment_id?: string
          created_at?: string
          id?: string
          outcome?: string
          previous_status?: string
          reason?: string
          review_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_history_assignment_id_review_version_fkey"
            columns: ["assignment_id", "review_version"]
            isOneToOne: false
            referencedRelation: "evaluation_review_history"
            referencedColumns: ["assignment_id", "version"]
          },
        ]
      }
      draft_opportunities: {
        Row: {
          id: string
          track: string
        }
        Insert: {
          id: string
          track: string
        }
        Update: {
          id?: string
          track?: string
        }
        Relationships: []
      }
      enrollment_documents: {
        Row: {
          application_id: string | null
          created_at: string
          filename: string
          id: string
          mime_type: string
          owner_id: string
          path: string
          size_bytes: number
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          owner_id: string
          path: string
          size_bytes: number
        }
        Update: {
          application_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          owner_id?: string
          path?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          assigned_by: string
          evaluator_id: string
          generation: number
          id: string
          reason: string
          superseded_at: string | null
        }
        Insert: {
          application_id: string
          assigned_at?: string
          assigned_by: string
          evaluator_id: string
          generation: number
          id?: string
          reason?: string
          superseded_at?: string | null
        }
        Update: {
          application_id?: string
          assigned_at?: string
          assigned_by?: string
          evaluator_id?: string
          generation?: number
          id?: string
          reason?: string
          superseded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_commands: {
        Row: {
          actor_id: string
          application_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Insert: {
          actor_id: string
          application_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Update: {
          actor_id?: string
          application_id?: string
          mutation_id?: string
          request_hash?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_commands_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_review_history: {
        Row: {
          actor_id: string
          assignment_id: string
          created_at: string
          id: string
          notes: string
          recommendation: string
          version: number
        }
        Insert: {
          actor_id: string
          assignment_id: string
          created_at?: string
          id?: string
          notes: string
          recommendation: string
          version: number
        }
        Update: {
          actor_id?: string
          assignment_id?: string
          created_at?: string
          id?: string
          notes?: string
          recommendation?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_review_history_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "evaluation_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_reviews: {
        Row: {
          assignment_id: string
          notes: string
          recommendation: string
          updated_at: string
          version: number
        }
        Insert: {
          assignment_id: string
          notes?: string
          recommendation: string
          updated_at?: string
          version: number
        }
        Update: {
          assignment_id?: string
          notes?: string
          recommendation?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "evaluation_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_commands: {
        Row: {
          actor_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Insert: {
          actor_id: string
          mutation_id: string
          request_hash: string
          result: Json
        }
        Update: {
          actor_id?: string
          mutation_id?: string
          request_hash?: string
          result?: Json
        }
        Relationships: []
      }
      intake_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          new_state: string
          previous_state: string
          reason: string
          settings_version: number
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          new_state: string
          previous_state: string
          reason: string
          settings_version: number
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          new_state?: string
          previous_state?: string
          reason?: string
          settings_version?: number
        }
        Relationships: []
      }
      opportunity_capacities: {
        Row: {
          capacity: number
          opportunity_id: string
        }
        Insert: {
          capacity: number
          opportunity_id: string
        }
        Update: {
          capacity?: number
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_capacities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "draft_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_settings: {
        Row: {
          closes_at: string
          finalized_at: string | null
          id: boolean
          intake_state: string
          opens_at: string
          updated_at: string
          version: number
        }
        Insert: {
          closes_at: string
          finalized_at?: string | null
          id?: boolean
          intake_state: string
          opens_at: string
          updated_at?: string
          version?: number
        }
        Update: {
          closes_at?: string
          finalized_at?: string | null
          id?: boolean
          intake_state?: string
          opens_at?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      staff_access_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          mutation_id: string
          new_role: string
          new_status: string
          previous_role: string | null
          previous_status: string | null
          reason: string
          request: Json
          result: Json
          target_id: string
          target_version: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          mutation_id: string
          new_role: string
          new_status: string
          previous_role?: string | null
          previous_status?: string | null
          reason: string
          request: Json
          result: Json
          target_id: string
          target_version: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          mutation_id?: string
          new_role?: string
          new_status?: string
          previous_role?: string | null
          previous_status?: string | null
          reason?: string
          request?: Json
          result?: Json
          target_id?: string
          target_version?: number
        }
        Relationships: []
      }
      staff_memberships: {
        Row: {
          created_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          role: string
          status: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_application_export: { Args: { p_filters?: Json }; Returns: Json }
      admin_application_queue: {
        Args: { p_filters?: Json; p_offset?: number }
        Returns: Json
      }
      alpha_can_review: { Args: { p_application: string }; Returns: boolean }
      alpha_claim_message: { Args: { p_id: string }; Returns: boolean }
      alpha_enrollment: { Args: { p_application?: string }; Returns: Json }
      alpha_finish_message: {
        Args: { p_id: string; p_state: string }
        Returns: undefined
      }
      alpha_issue_member: {
        Args: {
          p_email: string
          p_joined: string
          p_name: string
          p_position: string
          p_reason: string
          p_status?: string
        }
        Returns: Json
      }
      alpha_member: { Args: { p_id?: string }; Returns: Json }
      alpha_messages: { Args: { p_application: string }; Returns: Json }
      alpha_notifications: { Args: { p_read?: string }; Returns: Json }
      alpha_prepare_message: {
        Args: {
          p_application: string
          p_body: string
          p_calendly?: string
          p_id: string
          p_kind: string
          p_subject: string
          p_version: number
        }
        Returns: Json
      }
      alpha_save_enrollment: {
        Args: {
          p_filename: string
          p_path: string
          p_size: number
          p_type: string
        }
        Returns: Json
      }
      alpha_security_log: { Args: never; Returns: Json }
      alpha_update_member: {
        Args: { p_name: string; p_photo?: string }
        Returns: Json
      }
      alpha_upload_budget: { Args: { p_bucket: string }; Returns: boolean }
      bootstrap_first_staff_admin: {
        Args: { p_email: string; p_reason: string }
        Returns: undefined
      }
      decision_history_page: {
        Args: { p_application_id: string; p_offset?: number }
        Returns: Json
      }
      decision_state: { Args: { p_application_id: string }; Returns: Json }
      evaluation_detail: { Args: { p_application_id: string }; Returns: Json }
      evaluation_history: {
        Args: { p_application_id: string; p_offset?: number }
        Returns: Json
      }
      evaluation_list: {
        Args: { p_offset?: number; p_search?: string }
        Returns: Json
      }
      get_application_state: { Args: never; Returns: Json }
      intake_history_page: { Args: { p_offset?: number }; Returns: Json }
      intake_state: { Args: never; Returns: Json }
      is_applicant_account: { Args: never; Returns: boolean }
      is_staff_account: { Args: never; Returns: boolean }
      list_staff_history: {
        Args: { p_before_version?: number; p_target_id: string }
        Returns: Json
      }
      list_staff_members: { Args: never; Returns: Json }
      manage_decision: { Args: { p_request: Json }; Returns: Json }
      manage_evaluation: { Args: { p_request: Json }; Returns: Json }
      manage_intake: { Args: { p_request: Json }; Returns: Json }
      manage_staff_access: { Args: { p_request: Json }; Returns: Json }
      save_applicant_draft: {
        Args: {
          p_data: Json
          p_expected_version: number
          p_mutation_id: string
        }
        Returns: Json
      }
      submit_applicant_application: {
        Args: { p_expected_version: number; p_mutation_id: string }
        Returns: Json
      }
      valid_draft_payload: { Args: { p: Json }; Returns: boolean }
      withdraw_applicant_application: {
        Args: { p_expected_version: number; p_mutation_id: string }
        Returns: Json
      }
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
    Enums: {},
  },
} as const
