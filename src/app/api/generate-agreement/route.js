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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a legal document generator. You must respond with valid JSON only. Your response must be a single JSON object with exactly these fields:
          - "title" (string): A concise name for the document.
          - "description" (string): A brief explanation of the document's purpose.
          - "content" (string): The main body of the document written in Markdown format. Each placeholder must be included in a structured format, using the format "{{PLACEHOLDER_NAME}}". Placeholders must clearly represent dynamic fields that need to be filled by the user.
          - "placeholders" (array): A list of all placeholders used in the document, each as an object with two fields: 
            1. "name" (string): The name of the placeholder.
            2. "description" (string): A brief description of what the placeholder represents.
        
        For illegal requests or requests that don't comply with ${jurisdiction} laws, set "isLegal" to false. Otherwise, set "isLegal" to true.
        
        Ensure the JSON is strictly valid, and the document content is elaborate, detailed, and professionally formatted for legal use. Use a formal tone and structure throughout, and do not include any extraneous text outside the JSON response.`,
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
