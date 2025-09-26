// netlify/functions/supabase/supabase.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const pathParts = event.path.split('/');
  const tableName = pathParts[pathParts.length - 1];

  // --- JOB 1: HANDLE "READ" REQUESTS (GET) ---
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;

      // Translator for weavers table (snake_case from DB to camelCase for App)
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
        return { statusCode: 200, body: JSON.stringify({ data: translatedData }) };
      }
      
      // For other tables, just send the data
      return { statusCode: 200, body: JSON.stringify({ data }) };

    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // --- JOB 2: HANDLE "ADD" REQUESTS (POST) ---
  if (event.httpMethod === 'POST') {
    try {
      const appData = JSON.parse(event.body);

      // Translator for weavers table (camelCase from App to snake_case for DB)
      let dbData = appData;
      if (tableName === 'weavers') {
        dbData = {
          name: appData.name,
          contact: appData.contact,
          join_date: appData.joinDate,
          loom_number: appData.loomNumber,
          loom_type: appData.loomType,
          wage_type: appData.wageType,
          rate: appData.rate,
          rental_cost: appData.rentalCost,
          rental_period: appData.rentalPeriod,
          design_allocations: appData.designAllocations,
        };
      }
      
      const { data, error } = await supabase.from(tableName).insert([dbData]).select().single();
      if (error) throw error;

      // No need to translate back, the app will just re-fetch the list.
      return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // If the request is not GET or POST
  return { statusCode: 405, body: 'Method Not Allowed' };
};
