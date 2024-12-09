import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: "public",
    },
  }
);

export async function POST(req) {
  try {
    const { prompt, userId, jurisdiction } = await req.json();

    if (!userId || !jurisdiction) {
      return NextResponse.json(
        { error: "User ID and jurisdiction are required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a legal document generator. You must respond with valid JSON only. Your response must be a single JSON object with exactly these fields: "title" (string), "description" (string), "content" (string), and "isLegal" (boolean). The "content" field must include detailed Markdown content with appropriate placeholders denoted by [PLACEHOLDERS]. For illegal requests or requests that don't comply with ${jurisdiction} laws, set "isLegal" to false. The "title" should be a concise name for the document, and the "description" should briefly explain its purpose. Ensure that the document content is as elaborate and detailed as necessary for professional use, typically resembling a legal document prepared by an experienced lawyer. Use a formal tone and structure throughout, do not try to be concise.






`,
        },
        {
          role: "user",
          content: `Generate a legal agreement for the following jurisdiction: ${jurisdiction}. Request: ${prompt}`,
        },
      ],
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content;
    let parsedResponse;
    try {
      const cleanedResponse = response.trim().replace(/[\n\r]/g, " ");
      parsedResponse = JSON.parse(cleanedResponse);

      // Validate required fields
      const requiredFields = ["title", "description", "content", "isLegal"];
      const missingFields = requiredFields.filter(
        (field) => !(field in parsedResponse)
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }
    } catch (error) {
      console.error("JSON parsing error:", error, "Raw response:", response);
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      );
    }

    if (!parsedResponse.isLegal) {
      return NextResponse.json(
        { error: "Cannot generate illegal or unethical agreements" },
        { status: 400 }
      );
    }

    // When inserting, try using rpc call instead
    const { data, error } = await supabase.rpc("insert_template", {
      p_user_id: userId,
      p_template_name: parsedResponse.title,
      p_content: String(parsedResponse.content),
      p_ideal_for: parsedResponse.description,
      p_description: parsedResponse.description,
      p_is_ai_generated: parsedResponse.isLegal,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Failed to save template",
          details: error.message,
          userId: userId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: parsedResponse.title,
      description: parsedResponse.description,
      content: String(parsedResponse.content),
      isLegal: parsedResponse.isLegal,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate agreement",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
