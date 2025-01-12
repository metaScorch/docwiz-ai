import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, trackAPIUsage } from "@/utils/rateLimiter";
import { headers } from "next/headers";

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
    const {
      prompt,
      userId,
      jurisdiction,
      complexity,
      length,
      businessContext,
    } = await req.json();

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

    const businessContextPrompt = businessContext
      ? `
Additional Business Context:
- Entity Name: ${businessContext.entity_name}
- Organization Type: ${businessContext.organization_type}
- Industry: ${businessContext.industry}
- Business Description: ${businessContext.description}
- Jurisdiction: ${businessContext.jurisdiction}

Please tailor the agreement specifically for this business context, incorporating relevant industry-specific terms and considerations while maintaining the requested complexity level.
    `
      : "";

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: `You are a legal document generator. You must respond with valid JSON only. Your response must contain two primary objects:

1. **Document Details**:
   - "title" (string): A concise name for the document.
   - "description" (string): A brief explanation of the document's purpose.
   - "content" (string): The main body of the document written in Markdown format. ALWAYS use generic placeholders in the format "{{PLACEHOLDER_NAME}}" for any variable information, even when specific values are provided in the prompt. Never embed actual values directly in the content. DO NOT include any signature blocks, signature sections, or disclaimers at the end of the document as these will be handled separately.
   - "isLegal" (boolean): Indicate whether the requested agreement is legal in the specified jurisdiction.
   - "legalityNotes" (string): Optional explanation if the agreement is not legal.

2. **Placeholders**:
   - A list of all placeholders used in the "content" field. Each placeholder must be represented as an object with:
      - "name" (string): The exact name of the placeholder (e.g., "PLACEHOLDER_NAME").
      - "description" (string): A brief description of the purpose or meaning of the placeholder.
      - "value" (string): IMPORTANT: You MUST extract and populate this field with any relevant values provided in the prompt or business context. For example:
         - If the prompt mentions salary, populate BASE_SALARY's value
         - If business context includes company name, populate COMPANY_NAME's value
         - If business context includes address details, populate ADDRESS related values
         Only leave this empty if no relevant information is provided in the prompt or context.
      - "format" (object): Specifies the input format with properties:
         - "type": One of "text", "date", "currency", "number", "email", "phone".
         - "currency": Required if type is "currency", specify "USD" or "INR" based on jurisdiction.
         - "pattern": Optional regex pattern for validation.
      - "signer" (boolean): Required field indicating whether this placeholder represents a signing party's name. Must be true for any signing party placeholders and false for all other placeholders.

EXAMPLE:
If a prompt contains "paid 180k USD per year and 20% bonus, 0.5% stock over 4 years with 6 months cliff", you should populate:
- BASE_SALARY: "180000"
- PERFORMANCE_BONUS_PERCENTAGE: "20"
- EQUITY_PERCENTAGE: "0.5"
- VESTING_PERIOD: "4 years"
- CLIFF_PERIOD: "6 months"

If business context contains:
{
  "entity_name": "RentEz, Inc",
  "organization_type": "Startup",
  "city_name": "Menlo Park",
  "state_name": "CA"
}
You should populate:
- COMPANY_TYPE: "Startup"
- COMPANY_ADDRESS: "Menlo Park, CA, USA"

Important Guidelines:
1. Always use placeholders in the document content, even when specific values are provided in the prompt.
2. You MUST extract and populate placeholder values when the information is available in either:
   - The user's prompt (e.g., salary, role, stock details)
   - The business context (e.g., company name, address, industry)
3. The document content should remain generic and reusable.
4. Common values to extract from prompt (when available):
   - Salary figures
   - Bonus percentages
   - Stock/equity details
   - Role/position titles
   - Vesting schedules
5. Common values to extract from business context:
   - Company name
   - Address components
   - Industry
   - Organization type
   - Jurisdiction

Important: Do not include any disclaimers, legal notices, or statements about consulting attorneys. The document should be complete and legally valid without such disclaimers. Do not include any signature blocks, signature lines, or signature sections in the document content. These will be handled separately by the system.

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

    // Get the headers instance properly
    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    // Parse the OpenAI response
    const cleanedResponse = response
      .trim()
      .replace(/[\n\r]/g, " ")
      .replace(/^```json\s*|\s*```$/g, "");
    const parsedResponse = JSON.parse(cleanedResponse);

    // Get the document details and placeholders with proper structure
    const documentDetails = parsedResponse.DocumentDetails;
    const placeholders = parsedResponse.Placeholders;

    if (!documentDetails || !placeholders) {
      throw new Error("Missing DocumentDetails or Placeholders");
    }

    // Call the extract-values endpoint
    const extractValuesResponse = await fetch(`${origin}/api/extract-values`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        businessContext,
        placeholders: placeholders, // Pass the correct placeholders array
      }),
    });

    const extractedValues = await extractValuesResponse.json();

    // Update the placeholders with extracted values
    const updatedPlaceholders = placeholders.map((placeholder) => ({
      ...placeholder,
      value: extractedValues[placeholder.name] || "",
    }));

    // Save to database with correct structure
    const { data: document, error } = await supabase
      .from("user_documents")
      .insert([
        {
          user_id: userId,
          title: documentDetails.title,
          content: documentDetails.content,
          placeholder_values: updatedPlaceholders,
          status: "draft",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to save document", details: error.message },
        { status: 500 }
      );
    }

    // Return response with correct structure
    return NextResponse.json({
      id: document.id,
      title: documentDetails.title,
      description: documentDetails.description,
      content: documentDetails.content,
      placeholder_values: updatedPlaceholders,
      isLegal: documentDetails.isLegal ?? true,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate agreement", details: error.message },
      { status: 500 }
    );
  }
}
