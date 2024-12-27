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
          content: `You are a legal document generator. You must respond with valid JSON only. Your response must contain two primary objects:
          
        1. **Document Details**:
           - "title" (string): A concise name for the document.
           - "description" (string): A brief explanation of the document's purpose.
           - "content" (string): The main body of the document written in Markdown format. Include placeholders for dynamic fields in the format "{{PLACEHOLDER_NAME}}" where appropriate.
        
        2. **Placeholders**:
           - A list of all placeholders used in the "content" field. Each placeholder must be represented as an object with:
              - "name" (string): The exact name of the placeholder (e.g., "PLACEHOLDER_NAME").
              - "description" (string): A brief description of the purpose or meaning of the placeholder.
        
        Ensure the JSON is strictly valid, and the document content is detailed, professional, and formatted in Markdown.`,
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

      // Validate and restructure the response
      const documentDetails = parsedResponse["Document Details"];
      const placeholders = parsedResponse["Placeholders"];

      if (!documentDetails || !placeholders) {
        throw new Error("Missing Document Details or Placeholders");
      }

      // Initialize placeholder values with empty values
      const placeholderValues = placeholders.map((placeholder) => ({
        ...placeholder,
        value: "",
      }));

      // Insert the new document
      const { data: document, error } = await supabase
        .from("user_documents")
        .insert([
          {
            user_id: userId,
            title: documentDetails.title,
            content: documentDetails.content,
            placeholder_values: placeholderValues,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          {
            error: "Failed to save document",
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: document.id,
        title: documentDetails.title,
        description: documentDetails.description,
        content: documentDetails.content,
        placeholder_values: placeholderValues,
      });
    } catch (error) {
      console.error("JSON parsing error:", error, "Raw response:", response);
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      );
    }
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
