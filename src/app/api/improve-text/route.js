import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { selectedText, fullDocument, prompt } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in improving legal documents while maintaining their legal validity and professional tone.",
        },
        {
          role: "user",
          content: `I have a legal document with the following selected section:

---
${selectedText}
---

Full document context:
${fullDocument}

Please improve this section based on this request: ${prompt}

Return only the improved section, maintaining proper formatting and ensuring it fits seamlessly into the document. Dont mention anything other than the text you are improving. Return the text in MD format.`,
        },
      ],
    });

    return NextResponse.json({
      improvedText: completion.choices[0].message.content.trim(),
    });
  } catch (error) {
    console.error("Error improving text:", error);
    return NextResponse.json(
      { error: "Failed to improve text" },
      { status: 500 }
    );
  }
}
