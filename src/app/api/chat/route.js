import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { messages, documentContent } = await req.json();

    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant analyzing a document. Here's the document content: ${documentContent}
      
      Help the user understand the document, answer questions about it, and suggest improvements when asked.
      If the user asks for changes, explain how the document could be modified to incorporate their suggestions.`,
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
    });

    return NextResponse.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
