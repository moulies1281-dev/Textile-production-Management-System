// netlify/functions/supabase/supabase.js

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event) {
  // Get the database keys from Netlify's environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // Make a connection to the Supabase database
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Figure out which table the app is asking for from the URL
  // e.g., /.netlify/functions/supabase/weavers -> extracts "weavers"
  const pathParts = event.path.split('/');
  const tableName = pathParts[pathParts.length - 1];

  try {
    // Fetch all columns (*) from the requested table
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      throw error;
    }

    // Send the data back successfully
    return {
      statusCode: 200,
      body: JSON.stringify({ data }), // Wrap the data in a "data" object
    };

  } catch (error) {
    console.error(`Error fetching from table ${tableName}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch data from ${tableName}` }),
    };
  }
};
