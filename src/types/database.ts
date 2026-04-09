export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          description: string | null
          logo_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          description?: string | null
          logo_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          id: string
          company_id: string
          invited_email: string
          invited_by_user_id: string
          role: 'admin' | 'member'
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          invite_token: string
          accepted_by_user_id: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invited_email: string
          invited_by_user_id: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          invite_token?: string
          accepted_by_user_id?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invited_email?: string
          invited_by_user_id?: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          invite_token?: string
          accepted_by_user_id?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          company_id: string
          owner_id: string
          name: string
          description: string | null
          status: 'active' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          owner_id: string
          name: string
          description?: string | null
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          owner_id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Relationships: []
      }
      kanban_lists: {
        Row: {
          id: string
          workspace_id: string
          name: string
          position: number
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          position?: number
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          position?: number
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kanban_cards: {
        Row: {
          id: string
          list_id: string
          workspace_id: string
          title: string
          description: string | null
          position: number
          assignee_id: string | null
          priority: 'high' | 'medium' | 'low'
          status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          due_date: string | null
          estimate_points: number | null
          tags: string[]
          started_at: string | null
          completed_at: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          workspace_id: string
          title: string
          description?: string | null
          position?: number
          assignee_id?: string | null
          priority?: 'high' | 'medium' | 'low'
          status?: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          due_date?: string | null
          estimate_points?: number | null
          tags?: string[]
          started_at?: string | null
          completed_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          workspace_id?: string
          title?: string
          description?: string | null
          position?: number
          assignee_id?: string | null
          priority?: 'high' | 'medium' | 'low'
          status?: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          due_date?: string | null
          estimate_points?: number | null
          tags?: string[]
          started_at?: string | null
          completed_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kanban_subtasks: {
        Row: {
          id: string
          card_id: string
          title: string
          description: string | null
          is_completed: boolean
          position: number
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          card_id: string
          title: string
          description?: string | null
          is_completed?: boolean
          position?: number
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          title?: string
          description?: string | null
          is_completed?: boolean
          position?: number
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          owner_id: string | null
          file_name: string | null
          file_desc: string | null
          file_mime: string | null
          file_size: number | null
          file_bucket: string | null
          file_folder: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id?: string | null
          file_name?: string | null
          file_desc?: string | null
          file_mime?: string | null
          file_size?: number | null
          file_bucket?: string | null
          file_folder?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          file_name?: string | null
          file_desc?: string | null
          file_mime?: string | null
          file_size?: number | null
          file_bucket?: string | null
          file_folder?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_id: string | null
          bio: string | null
          cover_photo_id: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          onboarding_status: string
          onboarding_step: number
          updated_at: string
          user_name: string | null
        }
        Insert: {
          avatar_id?: string | null
          bio?: string | null
          cover_photo_id?: string | null
          created_at?: string
          first_name?: string
          id: string
          last_name?: string
          onboarding_status?: string
          onboarding_step?: number
          updated_at?: string
          user_name?: string | null
        }
        Update: {
          avatar_id?: string | null
          bio?: string | null
          cover_photo_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          onboarding_status?: string
          onboarding_step?: number
          updated_at?: string
          user_name?: string | null
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

// Convenience type for the profiles row
export type Profile = Tables<"profiles">
