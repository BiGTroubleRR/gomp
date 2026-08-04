// Hand-written to match supabase/schema.sql — regenerate with the Supabase CLI
// (`supabase gen types typescript`) if the schema drifts from this file.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          street: string;
          city: string;
          zip: string;
          country: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          street: string;
          city: string;
          zip: string;
          country: string;
          is_default?: boolean;
        };
        Update: {
          label?: string;
          street?: string;
          city?: string;
          zip?: string;
          country?: string;
          is_default?: boolean;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          order_number: string;
          name: string;
          status: 'Building' | 'Shipped' | 'Delivered';
          total_eur: number;
          eta: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_number: string;
          name: string;
          status?: 'Building' | 'Shipped' | 'Delivered';
          total_eur: number;
          eta?: string | null;
        };
        Update: {
          status?: 'Building' | 'Shipped' | 'Delivered';
          eta?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          category: string;
          name: string;
          price_eur: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          category: string;
          name: string;
          price_eur: number;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
