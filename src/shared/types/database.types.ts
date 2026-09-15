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
      matches: {
        Row: {
          created_at: string
          id: string
          status: string
          user_1_id: string
          user_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user_1_id: string
          user_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user_1_id?: string
          user_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_1_id_fkey"
            columns: ["user_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_2_id_fkey"
            columns: ["user_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
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
          },
        ]
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          discovery_mode: string
          display_name: string
          github_url: string | null
          id: string
          interests: string[]
          preferred_roles: string[]
          skill_level: string | null
          tech_stack: string[]
          updated_at: string
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discovery_mode?: string
          display_name: string
          github_url?: string | null
          id: string
          interests?: string[]
          preferred_roles?: string[]
          skill_level?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discovery_mode?: string
          display_name?: string
          github_url?: string | null
          id?: string
          interests?: string[]
          preferred_roles?: string[]
          skill_level?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          actor_id: string
          actor_type: string
          created_at: string
          created_by_user_id: string
          decision: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          actor_id: string
          actor_type: string
          created_at?: string
          created_by_user_id: string
          decision: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          actor_id?: string
          actor_type?: string
          created_at?: string
          created_by_user_id?: string
          decision?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_membership_proposals: {
        Row: {
          candidate_response: string
          candidate_user_id: string
          created_at: string
          id: string
          initiated_by_user_id: string | null
          proposal_type: string
          required_yes_votes: number
          resolved_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          candidate_response?: string
          candidate_user_id: string
          created_at?: string
          id?: string
          initiated_by_user_id?: string | null
          proposal_type: string
          required_yes_votes: number
          resolved_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          candidate_response?: string
          candidate_user_id?: string
          created_at?: string
          id?: string
          initiated_by_user_id?: string | null
          proposal_type?: string
          required_yes_votes?: number
          resolved_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_membership_proposals_candidate_user_id_fkey"
            columns: ["candidate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_membership_proposals_initiated_by_user_id_fkey"
            columns: ["initiated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_membership_proposals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_membership_votes: {
        Row: {
          created_at: string
          decision: string
          id: string
          proposal_id: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          proposal_id: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          proposal_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_membership_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "team_membership_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_membership_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_members: number
          name: string
          project_idea: string | null
          repo_url: string | null
          tech_stack: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_members?: number
          name: string
          project_idea?: string | null
          repo_url?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_members?: number
          name?: string
          project_idea?: string | null
          repo_url?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cast_team_membership_vote: {
        Args: { p_decision: string; p_proposal_id: string }
        Returns: boolean
      }
      create_team_membership_proposal: {
        Args: {
          p_candidate_user_id: string
          p_proposal_type: string
          p_team_id: string
        }
        Returns: string
      }
      create_team_with_creator: {
        Args: {
          p_creator_role?: string
          p_description?: string
          p_max_members?: number
          p_name: string
          p_project_idea?: string
          p_repo_url?: string
          p_tech_stack?: string[]
        }
        Returns: string
      }
      create_user_like_and_match: {
        Args: { p_target_user_id: string }
        Returns: {
          created_at: string
          decision: string
          match_created: boolean
          match_id: string | null
          matched: boolean
          swipe_id: string
          target_user_id: string
        }[]
      }
      finalize_team_membership_proposal: {
        Args: { p_proposal_id: string }
        Returns: boolean
      }
      respond_to_team_membership_proposal: {
        Args: { p_proposal_id: string; p_response: string }
        Returns: boolean
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
