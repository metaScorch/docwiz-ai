import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, trackAPIUsage } from "@/utils/rateLimiter";

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
    const { prompt, userId, jurisdiction, complexity, length } =
      await req.json();

    // Check rate limits
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Rate limit exceeded",
          details: "Too many requests. Please try again later.",
          resetIn: rateLimit.resetIn || 3600, // Default to 1 hour if not provided
        },
        { status: 429 }
      );
    }

    if (!userId || !jurisdiction) {
      return NextResponse.json(
        { error: "User ID and jurisdiction are required" },
        { status: 400 }
      );
    }

    // Define word count ranges based on length parameter
    const wordCountRanges = {
      1: { min: 300, max: 500 },
      2: { min: 600, max: 1000 },
      3: { min: 1200, max: 2000 },
      4: { min: 2500, max: 3500 },
      5: { min: 4000, max: 6000 },
    };

    // Define complexity descriptions
    const complexityLevels = {
      1: "Use simple, everyday language with minimal legal terms.",
      2: "Use basic legal terms with clear explanations.",
      3: "Use standard legal language balanced with clarity.",
      4: "Use detailed legal terminology with proper context.",
      5: "Use comprehensive legal language with technical precision.",
    };

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: `You are a legal document generator. You must respond with valid JSON only. Your response must contain two primary objects:

1. **Document Details**:
   - "title" (string): A concise name for the document.
   - "description" (string): A brief explanation of the document's purpose.
   - "content" (string): The main body of the document written in Markdown format. Include placeholders for dynamic fields in the format "{{PLACEHOLDER_NAME}}" where appropriate. DO NOT include any signature blocks or signature sections at the end of the document as these will be handled separately.
   - "isLegal" (boolean): Indicate whether the requested agreement is legal in the specified jurisdiction.
   - "legalityNotes" (string): Optional explanation if the agreement is not legal.

2. **Placeholders**:
   - A list of all placeholders used in the "content" field. Each placeholder must be represented as an object with:
      - "name" (string): The exact name of the placeholder (e.g., "PLACEHOLDER_NAME").
      - "description" (string): A brief description of the purpose or meaning of the placeholder.
      - "format" (object): Specifies the input format with properties:
         - "type": One of "text", "date", "currency", "number", "email", "phone".
         - "currency": Required if type is "currency", specify "USD" or "INR" based on jurisdiction.
         - "pattern": Optional regex pattern for validation.
      - "signer" (boolean): **Optional**, include only if the placeholder represents a signing party's name.

Important: Do not include any signature blocks, signature lines, or signature sections in the document content. These will be handled separately by the system.

The output must be valid JSON and strictly adhere to the described format.

Additional Requirements:
- The document should be between ${wordCountRanges[length].min} and ${wordCountRanges[length].max} words.
- Complexity Level: ${complexityLevels[complexity]}`,
        },
        {
          role: "user",
          content: `Generate a legal agreement for the following jurisdiction: ${jurisdiction}. Request: ${prompt}`,
        },
      ],
      temperature: 0.3,
    });

    // Track API usage
    await trackAPIUsage({
      userId,
      endpoint: "generate-agreement",
      tokensUsed: completion.usage?.total_tokens || 0,
      cost: (completion.usage?.total_tokens || 0) * 0.00002, // Approximate cost calculation
      registrationId: null, // Add if available
    });

    const response = completion.choices[0].message.content;
    let parsedResponse;

    try {
      const cleanedResponse = response
        .trim()
        .replace(/[\n\r]/g, " ")
        .replace(/^```json\s*|\s*```$/g, "");
      parsedResponse = JSON.parse(cleanedResponse);

      // Try both formats: "Document Details" and "DocumentDetails"
      const documentDetails =
        parsedResponse["Document Details"] || parsedResponse["DocumentDetails"];
      const placeholders = parsedResponse["Placeholders"];

      if (!documentDetails || !placeholders) {
        throw new Error("Missing DocumentDetails or Placeholders");
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

      // Check if the agreement is legal before proceeding
      if (documentDetails.isLegal === false) {
        return NextResponse.json(
          {
            isLegal: false,
            legalityNotes:
              documentDetails.legalityNotes ||
              "This agreement is not legal in the specified jurisdiction.",
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        id: document.id,
        title: documentDetails.title,
        description: documentDetails.description,
        content: documentDetails.content,
        placeholder_values: placeholderValues,
        isLegal: documentDetails.isLegal ?? true,
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
