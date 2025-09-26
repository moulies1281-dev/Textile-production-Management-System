// netlify/functions/supabase/supabase.js

exports.handler = async function (event, context) { // <-- add context here
  const { supabase } = context.clientContext.supabase;
  const pathParts = event.path.split('/');
  const tableName = pathParts[pathParts.length - 1];

  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;

    // --- TRANSLATOR ---
    // If the data is for weavers, translate the keys to camelCase for the app.
    if (tableName === 'weavers') {
      const translatedData = data.map(weaver => ({
        id: weaver.id,
        createdAt: weaver.created_at,
        name: weaver.name,
        contact: weaver.contact,
        joinDate: weaver.join_date,
        loomNumber: weaver.loom_number,
        loomType: weaver.loom_type,
        wageType: weaver.wage_type,
        rate: weaver.rate,
        rentalCost: weaver.rental_cost,
        rentalPeriod: weaver.rental_period,
        designAllocations: weaver.design_allocations
      }));
      
      return {
        statusCode: 200,
        body: JSON.stringify({ data: translatedData }), // Send the translated data
      };
    }

    // For all other tables, send the data as is for now.
    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
