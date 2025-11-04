// src/services/geminiService.ts
// نسخه نهایی با کنترل کامل خطا، پشتیبانی از systemPrompt کاراکتر و بررسی کلید API

import { Message, Role } from "../types";
import { characters } from "../data/characters";

export interface ChatResponse {
  text: string | null;
}

// گرفتن کلید از محیط (Vercel یا Local)
const getApiKey = (): string | null => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("⚠️ کلید OpenRouter API وارد نشده است!");
    return null;
  }
  return apiKey;
};

// تابع اصلی برای پاسخ چت
export const getChatResponse = async (
  messages: Message[],
  systemInstruction: string,
  currentCharacterId?: string
): Promise<ChatResponse> => {
  try {
    const apiKey = getApiKey();

    // اگر کلید وجود ندارد، ارور نده — پیام واضح برگردون
    if (!apiKey) {
      return {
        text: "❌ کلید OpenRouter API تنظیم نشده است. لطفاً در تنظیمات پروژه (VITE_OPENROUTER_API_KEY) را وارد کنید.",
      };
    }

    // پیدا کردن کاراکتر فعال
    const selectedCharacter = characters.find(c => c.id === currentCharacterId);

    // ساخت پرامپت نهایی
    const systemPrompt =
      systemInstruction ||
      selectedCharacter?.systemPrompt ||
      "تو یک چت‌بات فارسی هستی.";

    // آماده‌سازی پیام‌ها برای ارسال به API
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages
        .filter(m => m.content?.trim() !== "")
        .map(m => ({
          role: m.role === Role.ASSISTANT ? "assistant" : "user",
          content: m.content,
        })),
    ];

    // ارسال به OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://wawbeawbrawb.vercel.app/", // آدرس سایتت
        "X-Title": "Iran Partner Chatbot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano", // مدل بدون فیلتر
        messages: formattedMessages,
        temperature: 1,
      }),
    });

    // اگر پاسخ نداد
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ خطا از OpenRouter API:", errorText);
      return { text: "⚠️ خطا در اتصال به OpenRouter. لطفاً بعداً دوباره تلاش کنید." };
    }

    // پاسخ موفق
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "⚠️ پاسخی از مدل دریافت نشد.";
    return { text };

  } catch (error) {
    console.error("⚠️ Chat Error:", error);
    return {
      text: "⚠️ مشکلی در ارتباط با API پیش آمد. لطفاً اتصال اینترنت یا کلید را بررسی کنید.",
    };
  }
};
