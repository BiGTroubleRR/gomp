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
      components: {
        Row: {
          id: string;
          category: string;
          name: string;
          price: number;
          specs: string;
          tier: string;
          passmark: number | null;
          passmark_url: string | null;
          market_price: number | null;
          case_size: string | null;
          socket: string | null;
          form_factor: string | null;
          case_width_mm: number | null;
          case_height_mm: number | null;
          case_depth_mm: number | null;
          max_gpu_length_mm: number | null;
          max_cooler_height_mm: number | null;
          max_radiator_mm: number | null;
          max_psu_length_mm: number | null;
          gpu_length_mm: number | null;
          gpu_slot_width: number | null;
          cooler_height_mm: number | null;
          cooler_radiator_mm: number | null;
          psu_length_mm: number | null;
          ram_height_mm: number | null;
          fan_mounts: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url: string | null;
          margin_override: { type: string; value: number } | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          name: string;
          price?: number;
          specs?: string;
          tier?: string;
          passmark?: number | null;
          passmark_url?: string | null;
          market_price?: number | null;
          case_size?: string | null;
          socket?: string | null;
          form_factor?: string | null;
          case_width_mm?: number | null;
          case_height_mm?: number | null;
          case_depth_mm?: number | null;
          max_gpu_length_mm?: number | null;
          max_cooler_height_mm?: number | null;
          max_radiator_mm?: number | null;
          max_psu_length_mm?: number | null;
          gpu_length_mm?: number | null;
          gpu_slot_width?: number | null;
          cooler_height_mm?: number | null;
          cooler_radiator_mm?: number | null;
          psu_length_mm?: number | null;
          ram_height_mm?: number | null;
          fan_mounts?: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url?: string | null;
          margin_override?: { type: string; value: number } | null;
          sort_order?: number;
        };
        Update: {
          category?: string;
          name?: string;
          price?: number;
          specs?: string;
          tier?: string;
          passmark?: number | null;
          passmark_url?: string | null;
          market_price?: number | null;
          case_size?: string | null;
          socket?: string | null;
          form_factor?: string | null;
          case_width_mm?: number | null;
          case_height_mm?: number | null;
          case_depth_mm?: number | null;
          max_gpu_length_mm?: number | null;
          max_cooler_height_mm?: number | null;
          max_radiator_mm?: number | null;
          max_psu_length_mm?: number | null;
          gpu_length_mm?: number | null;
          gpu_slot_width?: number | null;
          cooler_height_mm?: number | null;
          cooler_radiator_mm?: number | null;
          psu_length_mm?: number | null;
          ram_height_mm?: number | null;
          fan_mounts?: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url?: string | null;
          margin_override?: { type: string; value: number } | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      // Demand-signal rows from /checkout. Intentionally has no card-data
      // fields — see the table comment in supabase/schema.sql.
      checkout_intents: {
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          region: string;
          zip: string;
          payment_method: 'card' | 'google_pay' | 'apple_pay';
          shipping_method: 'standard' | 'express' | 'overnight';
          parts_total_eur: number;
          shipping_eur: number;
          assembly_eur: number;
          discount_eur: number;
          total_eur: number;
          promo_code: string;
          build_items: { category: string; name: string; price_eur: number }[];
          display_currency: string;
          lang: string;
          contact_consent: boolean;
          status: 'new' | 'contacted' | 'converted' | 'archived';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          email: string;
          phone?: string;
          address?: string;
          city?: string;
          region?: string;
          zip?: string;
          payment_method: 'card' | 'google_pay' | 'apple_pay';
          shipping_method?: 'standard' | 'express' | 'overnight';
          parts_total_eur?: number;
          shipping_eur?: number;
          assembly_eur?: number;
          discount_eur?: number;
          total_eur?: number;
          promo_code?: string;
          build_items?: { category: string; name: string; price_eur: number }[];
          display_currency?: string;
          lang?: string;
          contact_consent?: boolean;
          status?: 'new' | 'contacted' | 'converted' | 'archived';
        };
        Update: {
          status?: 'new' | 'contacted' | 'converted' | 'archived';
        };
        Relationships: [];
      };
      // Server-only request counter (see supabase/schema.sql) — no RLS policy,
      // so only the service-role client ever touches this table.
      rate_limit_hits: {
        Row: {
          key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          key: string;
          window_start?: string;
          count?: number;
        };
        Update: {
          key?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
