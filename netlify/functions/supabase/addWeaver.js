// netlify/functions/addWeaver.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Security: Only allow POST requests, which are used for sending new data.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the new weaver's data from the request sent by the app's form.
  const weaverData = JSON.parse(event.body);

  // Connect to the database using the secret keys stored in Netlify.
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    // Tell Supabase: "Insert this data into the 'weavers' table".
    const { data, error } = await supabase
      .from('weavers')
      .insert([weaverData]) // The data must be in an array.
      .select()             // IMPORTANT: Return the new row that was just created.
      .single();            // We expect only one row back.

    if (error) {
      throw error; // If Supabase gives an error, send it back.
    }

    // Send the newly created weaver (with its real database ID) back to the app as confirmation.
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Error adding weaver:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add weaver' }),
    };
  }
};
