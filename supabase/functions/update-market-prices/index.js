console.log("Hello from Functions!");

Deno.serve(async (req) => {
  try {
    const { name } = await req.json();

    const data = {
      message: `Hello ${name}!`,
    };

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
