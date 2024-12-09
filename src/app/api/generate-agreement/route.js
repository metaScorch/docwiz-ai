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
    const { prompt, userId } = await req.json();

    // Debug log to check userId
    console.log("Received userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Add debugging logs
    console.log("Attempting to insert with userId:", userId);

    // Verify userId format and auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log("Current auth user:", authData?.user?.id);

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing prompt" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            'You are a legal document generator. You must respond with valid JSON only. Your response must be a single JSON object with exactly these fields: "title" (string), "description" (string), "content" (string), and "isLegal" (boolean). For illegal requests, set isLegal to false. Example response format: {"title":"Document Title","description":"Brief description","content":"Markdown content with [PLACEHOLDERS]","isLegal":true}, The output must be in MD format and elaborate as much as possible, do not try to be concise.',
        },
        {
          role: "user",
          content: prompt,
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
