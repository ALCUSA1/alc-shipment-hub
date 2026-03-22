import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Mapbox access token not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, input, mapboxId } = await req.json();

    if (action === 'autocomplete') {
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(input)}&types=address,place&limit=5&language=en&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      // Transform to match frontend expectations
      const predictions = (data.suggestions || []).map((s: any) => ({
        place_id: s.mapbox_id,
        description: s.full_address || s.name,
        structured_formatting: {
          main_text: s.name,
          secondary_text: s.place_formatted || s.full_address || '',
        },
      }));

      return new Response(JSON.stringify({ predictions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'details') {
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}?access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      const feature = data.features?.[0];
      if (!feature) {
        return new Response(JSON.stringify({ result: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ctx = feature.properties?.context || {};
      const result = {
        formatted_address: feature.properties?.full_address || feature.properties?.name,
        name: feature.properties?.name,
        address_components: [
          { types: ['street_number'], long_name: feature.properties?.address || '' },
          { types: ['route'], long_name: ctx.street?.name || '' },
          { types: ['locality'], long_name: ctx.place?.name || '' },
          { types: ['administrative_area_level_1'], long_name: ctx.region?.name || '' },
          { types: ['postal_code'], long_name: ctx.postcode?.name || '' },
          { types: ['country'], long_name: ctx.country?.name || '' },
        ],
      };

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
