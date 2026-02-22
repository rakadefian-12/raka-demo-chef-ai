document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recipeForm");
  const ingredientsInput = document.getElementById("ingredients");
  const moodSelect = document.getElementById("mood");
  const generateBtn = document.getElementById("generateBtn");
  const loadingSpan = generateBtn.querySelector(".btn-loading");
  const textSpan = generateBtn.querySelector(".btn-text");

  // Output Elements
  const recipeResult = document.getElementById("recipeResult");
  const emptyState = document.getElementById("emptyState");
  const recipeTitle = document.getElementById("recipeTitle");
  const recipeTime = document.getElementById("recipeTime");
  const recipeMood = document.getElementById("recipeMood");
  const recipeIngredients = document.getElementById("recipeIngredients");
  const recipeSteps = document.getElementById("recipeSteps");
  const shareBtn = document.getElementById("shareBtn");

  // Check if API key is configured
  if (
    typeof CONFIG === "undefined" ||
    CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE"
  ) {
    console.error(
      "⚠️ API Key belum dikonfigurasi! Edit file config.js terlebih dahulu.",
    );
  }

  // Form submission handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Show Loading State
    setLoading(true);

    // 2. Get User Input
    const mood = moodSelect.value;
    const ingredients = ingredientsInput.value.trim();

    try {
      // 3. Call Gemini API
      const recipe = await generateRecipeWithAI(ingredients, mood);

      // 4. Render Recipe
      renderRecipe(recipe);

      // 5. Hide Loading & Show Result
      setLoading(false);
      emptyState.style.display = "none";
      recipeResult.style.display = "block";

      // Scroll to result on mobile
      recipeResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      setLoading(false);
      alert(
        "❌ Maaf, terjadi kesalahan saat meracik resep. Coba lagi ya!\n\nDetail: " +
        error.message,
      );
      console.error("Error:", error);
    }
  });

  /**
   * Generate recipe using Google Gemini API
   */
  async function generateRecipeWithAI(ingredients, mood) {
    // Map mood to context
    const moodContext = {
      "sahur-satset": "Sahur cepat maksimal 15 menit, praktis, mengenyangkan",
      "buka-hemat": "Buka puasa hemat budget, sederhana tapi enak",
      "sehat-kuat": "Menu sehat bergizi tinggi agar kuat puasa seharian",
      "takjil-manis": "Takjil manis dan segar untuk berbuka puasa",
    };

    const context = moodContext[mood] || "Masakan rumahan sederhana";

    // Construct prompt for Gemini
    const prompt = `Kamu adalah chef profesional Indonesia yang ahli masakan Ramadan.

Berdasarkan bahan-bahan berikut: ${ingredients}

Buatkan 1 resep masakan dengan kriteria: ${context}

ATURAN KETAT:
1. Output HANYA berupa JSON yang valid
2. JANGAN tambahkan teks penjelasan apapun
3. JANGAN gunakan markdown code block
4. JANGAN tambahkan komentar
5. Langsung mulai dengan { dan akhiri dengan }

Format JSON yang WAJIB diikuti:
{
  "title": "Nama Masakan yang Menarik",
  "time": "15 Menit",
  "ingredients": ["bahan 1 dengan takaran", "bahan 2 dengan takaran", "dst"],
  "steps": ["langkah 1 yang jelas", "langkah 2 yang jelas", "dst"]
}

Pastikan:
- Nama masakan menarik dan menggugah selera
- Waktu realistis sesuai kriteria
- Maksimal 8 bahan (gunakan input user + bahan dapur umum)
- Maksimal 6 langkah yang jelas dan mudah
- Setiap bahan ada takarannya (contoh: "2 butir telur", "1 sdm kecap")
- Output HARUS JSON valid tanpa tambahan apapun`;

    // API Request
    const apiUrl = `${CONFIG.GEMINI_API_URL}${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || "Unknown error"}`,
      );
    }

    const data = await response.json();

    // Extract text from Gemini response
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;

    if (!generatedText) {
      throw new Error("Tidak ada respon dari AI");
    }

    console.log("🤖 Raw AI Response:", generatedText);

    // Parse JSON from response
    // Gemini sometimes wraps JSON in markdown code blocks or adds extra text
    let cleanedText = generatedText.trim();

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Try to extract JSON if there's text before/after
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    console.log("🧹 Cleaned Text:", cleanedText);

    // Check if JSON is complete (basic validation)
    const openBraces = (cleanedText.match(/\{/g) || []).length;
    const closeBraces = (cleanedText.match(/\}/g) || []).length;
    const openBrackets = (cleanedText.match(/\[/g) || []).length;
    const closeBrackets = (cleanedText.match(/\]/g) || []).length;

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.error(
        "⚠️ JSON tidak lengkap! Braces:",
        openBraces,
        "vs",
        closeBraces,
        "| Brackets:",
        openBrackets,
        "vs",
        closeBrackets,
      );
      throw new Error(
        "Respon AI terpotong. Coba lagi atau kurangi jumlah bahan.",
      );
    }

    try {
      const recipe = JSON.parse(cleanedText);

      // Validate recipe structure
      if (!recipe.title || !recipe.ingredients || !recipe.steps) {
        console.warn("⚠️ Recipe structure incomplete:", recipe);
        throw new Error("Struktur resep tidak lengkap");
      }

      console.log("✅ Parsed Recipe:", recipe);
      return recipe;
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("📄 Attempted to parse:", cleanedText);

      // Fallback: Try to manually extract if AI gives readable text
      throw new Error("Format respon AI tidak valid. Silakan coba lagi.");
    }
  }

  /**
   * Set loading state
   */
  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.setAttribute("disabled", "true");
      generateBtn.setAttribute("aria-busy", "true");
      textSpan.style.display = "none";
      loadingSpan.style.display = "inline-block";
    } else {
      generateBtn.removeAttribute("disabled");
      generateBtn.removeAttribute("aria-busy");
      textSpan.style.display = "inline-block";
      loadingSpan.style.display = "none";
    }
  }

  /**
   * Render recipe to UI
   */
  function renderRecipe(data) {
    recipeTitle.textContent = data.title || "Resep Spesial";
    recipeTime.textContent = data.time || "30 Menit";

    // Map mood value to readable text
    const moodText =
      moodSelect.options[moodSelect.selectedIndex].text.split(" ")[1] ||
      "Spesial";
    recipeMood.textContent = moodText;

    // Render Ingredients
    if (data.ingredients && Array.isArray(data.ingredients)) {
      recipeIngredients.innerHTML = data.ingredients
        .map((item) => `<li>${item}</li>`)
        .join("");
    } else {
      recipeIngredients.innerHTML = "<li>Bahan tidak tersedia</li>";
    }

    // Render Steps
    if (data.steps && Array.isArray(data.steps)) {
      recipeSteps.innerHTML = data.steps
        .map((step) => `<li>${step}</li>`)
        .join("");
    } else {
      recipeSteps.innerHTML = "<li>Langkah tidak tersedia</li>";
    }
  }

  /**
   * Share to WhatsApp
   */
  shareBtn.addEventListener("click", () => {
    const title = recipeTitle.textContent;
    const time = recipeTime.textContent;
    const ingredients = Array.from(recipeIngredients.querySelectorAll("li"))
      .map((li) => li.textContent)
      .join("\n- ");
    const steps = Array.from(recipeSteps.querySelectorAll("li"))
      .map((li, i) => `${i + 1}. ${li.textContent}`)
      .join("\n");

    const message = `*${title}* 🍳\n⏱️ ${time}\n\n*Bahan-bahan:*\n- ${ingredients}\n\n*Cara Membuat:*\n${steps}\n\n_Dibuat dengan Ramadan Chef AI 🌙_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  });
});
