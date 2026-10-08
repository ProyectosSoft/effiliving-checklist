// Tipos del esquema de Supabase (formato de `supabase gen types typescript`).
// Escritos a mano a partir de supabase/migrations; regenerar con:
//   npx supabase gen types typescript --project-id <id> --schema public > types/database.ts

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
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: Json
          created_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string | null
          role_id: string | null
          active: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          email?: string | null
          role_id?: string | null
          active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          role_id?: string | null
          active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          property_id: string | null
          number: string
          floor: string | null
          room_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          property_id?: string | null
          number: string
          floor?: string | null
          room_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string | null
          number?: string
          floor?: string | null
          room_type?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_categories: {
        Row: {
          id: string
          name: string
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          id: string
          category_id: string | null
          label: string
          description: string | null
          sort_order: number | null
          active: boolean | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          category_id?: string | null
          label: string
          description?: string | null
          sort_order?: number | null
          active?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string | null
          label?: string
          description?: string | null
          sort_order?: number | null
          active?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "checklist_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_reviews: {
        Row: {
          id: string
          room_id: string | null
          reviewer_id: string | null
          review_type: string | null
          review_date: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          room_id?: string | null
          reviewer_id?: string | null
          review_type?: string | null
          review_date?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string | null
          reviewer_id?: string | null
          review_type?: string | null
          review_date?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_reviews_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_results: {
        Row: {
          id: string
          review_id: string | null
          item_id: string | null
          status: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          review_id?: string | null
          item_id?: string | null
          status?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          review_id?: string | null
          item_id?: string | null
          status?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_results_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "checklist_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      review_signoffs: {
        Row: {
          id: string
          review_id: string | null
          role_label: string | null
          signer_name: string | null
          signed_at: string | null
        }
        Insert: {
          id?: string
          review_id?: string | null
          role_label?: string | null
          signer_name?: string | null
          signed_at?: string | null
        }
        Update: {
          id?: string
          review_id?: string | null
          role_label?: string | null
          signer_name?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_signoffs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "checklist_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: { Args: { perm: string }; Returns: boolean }
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      can_read_review: { Args: { rid: string }; Returns: boolean }
      can_edit_review: { Args: { rid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
