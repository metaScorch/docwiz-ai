import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { content } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a markdown formatting expert. Your task is to improve the formatting of the provided markdown content without changing any of the actual content. Focus on proper heading hierarchy, consistent spacing, and professional markdown structure. Don't add any new content or formal message to acknowledge the request, just improve the formatting.",
        },
        {
          role: "user",
          content: content,
        },
      ],
      temperature: 0.3,
    });

    const formattedContent = response.choices[0].message.content;

    return NextResponse.json({ formattedContent });
  } catch (error) {
    console.error("Error in improve-formatting:", error);
    return NextResponse.json(
      { error: "Failed to improve formatting" },
      { status: 500 }
    );
  }
}
