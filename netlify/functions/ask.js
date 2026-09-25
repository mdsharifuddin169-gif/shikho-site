// এই ফাংশনটা Netlify-এর সার্ভারে চলে, ব্রাউজারে না —
// তাই এখানে API Key ব্যবহার করলেও ছাত্ররা সেটা দেখতে পারবে না।

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "শুধু POST রিকোয়েস্ট গ্রহণযোগ্য" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "সার্ভারে GEMINI_API_KEY সেট করা নেই।" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "ভুল রিকোয়েস্ট ফরম্যাট" }) };
  }

  const { question, cls, subject } = body;
  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: "প্রশ্ন খালি" }) };
  }

  const systemPrompt =
    "তুমি একজন বাংলাদেশি SSC/NCTB কারিকুলামের শিক্ষক। " +
    "ছাত্রটি Class " + cls + "-এর " + subject + " বিষয়ে প্রশ্ন করছে। " +
    "সবসময় সহজ, স্পষ্ট বাংলায় ধাপে ধাপে উত্তর দাও, যা ওই ক্লাসের লেভেলের সাথে মানানসই। " +
    "প্রয়োজনে সংখ্যা দিয়ে ধাপ ভাগ করো (১, ২, ৩...)। " +
    "উত্তর পরীক্ষায় লেখার উপযোগী হতে হবে। " +
    "কখনো LaTeX বা \\text{}, $ চিহ্ন ব্যবহার করো না — রাসায়নিক সংকেত বা সংখ্যা লিখতে সরাসরি সাধারণ টেক্সট ব্যবহার করো, যেমন H2O, CO2। " +
    "পুরো উত্তর শুধুমাত্র বাংলা ভাষায় লিখবে, ভুলেও অন্য কোনো ভাষার শব্দ ব্যবহার করবে না।";

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
        }),
      }
    );
    const data = await res.json();

    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "উত্তর পাওয়া যায়নি, আবার চেষ্টা করো।";

    return { statusCode: 200, body: JSON.stringify({ answer: text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
