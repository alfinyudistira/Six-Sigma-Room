export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userPrompt = req.body.messages[0].content;
  const apiKey = process.env.GEMINI_API_KEY;

  async function callGemini(modelName) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] }),
      }
    );
    return resp;
  }

  try {
    // Ubah ke model versi terbaru yang aktif saat ini
    let response = await callGemini("gemini-2.5-flash");
    let data = await response.json();

    // Kalau Flash gagal, fallback ke versi Pro terbaru
    if (!response.ok && data.error?.message?.includes("not found")) {
      response = await callGemini("gemini-2.5-pro");
      data = await response.json();
    }

    if (!response.ok) {
      return res.status(200).json({ content: [{ text: `Google Error: ${data.error?.message}` }] });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ content: [{ text: aiText || "Respon AI kosong." }] });

  } catch (error) {
    res.status(200).json({ content: [{ text: `System Error: ${error.message}` }] });
  }
}
