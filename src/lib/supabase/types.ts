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
          ram_generation: number | null;
          ram_speed_mhz: number | null;
          ram_family: string | null;
          fan_mounts: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url: string | null;
          margin_override: { type: string; value: number } | null;
          is_live: boolean;
          fan_size_mm: number | null;
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
          ram_generation?: number | null;
          ram_speed_mhz?: number | null;
          ram_family?: string | null;
          fan_mounts?: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url?: string | null;
          margin_override?: { type: string; value: number } | null;
          is_live?: boolean;
          fan_size_mm?: number | null;
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
          ram_generation?: number | null;
          ram_speed_mhz?: number | null;
          ram_family?: string | null;
          fan_mounts?: { position: string; maxCount: number; sizesMm: number[] }[] | null;
          image_url?: string | null;
          margin_override?: { type: string; value: number } | null;
          is_live?: boolean;
          fan_size_mm?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      // "Zákaznícke GOMPy" — already-completed customer builds shown at
      // /customer-builds. Same public-read/service-role-write shape as `components`.
      customer_builds: {
        Row: {
          id: string;
          title: string;
          customer_label: string;
          specs: string;
          price_eur: number | null;
          built_on: string | null;
          image_url: string | null;
          image_urls: string[] | null;
          is_live: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          customer_label?: string;
          specs?: string;
          price_eur?: number | null;
          built_on?: string | null;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_live?: boolean;
          sort_order?: number;
        };
        Update: {
          title?: string;
          customer_label?: string;
          specs?: string;
          price_eur?: number | null;
          built_on?: string | null;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_live?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      // The "Configure this PC" catalog — homepage hero, Featured Builds grid, /shop,
      // and the /build?prebuilt=<id> carry-over all read this same table.
      prebuilt_pcs: {
        Row: {
          id: string;
          name: string;
          tagline_en: string;
          tagline_sk: string;
          tagline_cz: string;
          cat: 'flagship' | 'performance' | 'midrange' | 'entry';
          tier: 'S' | 'A' | 'B' | 'C' | 'D' | null;
          price_eur: number;
          rating: number;
          mobo: string;
          cpu: string;
          cooler: string;
          ram: string;
          gpu: string;
          storage: string;
          psu: string;
          case: string;
          is_live: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          tagline_en?: string;
          tagline_sk?: string;
          tagline_cz?: string;
          cat?: 'flagship' | 'performance' | 'midrange' | 'entry';
          tier?: 'S' | 'A' | 'B' | 'C' | 'D' | null;
          price_eur?: number;
          rating?: number;
          mobo?: string;
          cpu?: string;
          cooler?: string;
          ram?: string;
          gpu?: string;
          storage?: string;
          psu?: string;
          case?: string;
          is_live?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          tagline_en?: string;
          tagline_sk?: string;
          tagline_cz?: string;
          cat?: 'flagship' | 'performance' | 'midrange' | 'entry';
          tier?: 'S' | 'A' | 'B' | 'C' | 'D' | null;
          price_eur?: number;
          rating?: number;
          mobo?: string;
          cpu?: string;
          cooler?: string;
          ram?: string;
          gpu?: string;
          storage?: string;
          psu?: string;
          case?: string;
          is_live?: boolean;
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
      // "Gomp Budget Builds" — a customer asks for a secondhand-parts build and a price
      // proposal instead of configuring a new-parts build. Same PII/RLS shape as
      // checkout_intents above.
      gbb_requests: {
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          budget_eur: number | null;
          use_case: string;
          notes: string;
          price_proposal_eur: number | null;
          proposal_notes: string;
          status: 'new' | 'researching' | 'quoted' | 'converted' | 'archived';
          lang: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          email: string;
          phone?: string;
          budget_eur?: number | null;
          use_case?: string;
          notes?: string;
          price_proposal_eur?: number | null;
          proposal_notes?: string;
          status?: 'new' | 'researching' | 'quoted' | 'converted' | 'archived';
          lang?: string;
        };
        Update: {
          price_proposal_eur?: number | null;
          proposal_notes?: string;
          status?: 'new' | 'researching' | 'quoted' | 'converted' | 'archived';
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
