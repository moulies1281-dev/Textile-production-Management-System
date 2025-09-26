// netlify/functions/addWeaver.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const weaverDataFromApp = JSON.parse(event.body);

  // --- TRANSLATOR ---
  // This block converts camelCase from the app to snake_case for the database.
  const weaverDataForDB = {
    name: weaverDataFromApp.name,
    contact: weaverDataFromApp.contact,
    join_date: weaverDataFromApp.joinDate, // Translated
    loom_number: weaverDataFromApp.loomNumber, // Translated
    loom_type: weaverDataFromApp.loomType,   // Translated
    wage_type: weaverDataFromApp.wageType,   // Translated
    rate: weaverDataFromApp.rate,
    rental_cost: weaverDataFromApp.rentalCost, // Translated
    rental_period: weaverDataFromApp.rentalPeriod, // Translated
    design_allocations: weaverDataFromApp.designAllocations, // Translated
  };

  const { supabase } = context.clientContext.supabase;

  try {
    // Now we insert the translated data
    const { data, error } = await supabase
      .from('weavers')
      .insert([weaverDataForDB]) // Use the translated data
      .select()
      .single();

    if (error) {
      // If there's an error, log it so we can see it in Netlify
      console.error("Supabase error:", error);
      throw error;
    }

    // --- SECOND TRANSLATOR ---
    // The data comes back from the DB as snake_case, so we translate it
    // back to camelCase before sending it to the app.
    const dataForApp = {
        id: data.id,
        createdAt: data.created_at,
        name: data.name,
        contact: data.contact,
        joinDate: data.join_date,
        loomNumber: data.loom_number,
        loomType: data.loom_type,
        wageType: data.wage_type,
        rate: data.rate,
        rentalCost: data.rental_cost,
        rentalPeriod: data.rental_period,
        designAllocations: data.design_allocations
    };


    return {
      statusCode: 200,
      // Send the re-translated data back to the app
      body: JSON.stringify(dataForApp),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
