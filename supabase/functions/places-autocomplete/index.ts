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
      // Use Mapbox Geocoding v5 (forward geocoding) — stable and well-supported
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?autocomplete=true&types=address,place&limit=5&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.message) {
        console.error('Mapbox error:', data.message);
        return new Response(JSON.stringify({ predictions: [], error: data.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const predictions = (data.features || []).map((f: any) => ({
        place_id: f.id,
        description: f.place_name,
        structured_formatting: {
          main_text: f.text,
          secondary_text: f.place_name.replace(f.text + ', ', ''),
        },
        _feature: f, // pass full feature for details
      }));

      return new Response(JSON.stringify({ predictions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'details') {
      // For Geocoding v5, we can re-geocode the mapboxId or use the feature directly
      // The mapboxId here is the feature id like "address.1234"
      // We'll do a reverse lookup or just parse the stored data
      // Actually, the frontend already has the description — let's do a forward geocode
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(mapboxId)}.json?types=address&limit=1&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      const feature = data.features?.[0];
      if (!feature) {
        return new Response(JSON.stringify({ result: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse context array for structured address components
      const ctx = feature.context || [];
      const getCtx = (prefix: string) => ctx.find((c: any) => c.id?.startsWith(prefix))?.text || '';

      const result = {
        formatted_address: feature.place_name,
        name: feature.text,
        address_components: [
          { types: ['street_number'], long_name: feature.address || '' },
          { types: ['route'], long_name: feature.text || '' },
          { types: ['locality'], long_name: getCtx('place') },
          { types: ['administrative_area_level_1'], long_name: getCtx('region') },
          { types: ['postal_code'], long_name: getCtx('postcode') },
          { types: ['country'], long_name: getCtx('country') },
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
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
