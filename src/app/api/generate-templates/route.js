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

const API_PASSWORD = "your_secure_password_here"; // Replace with your password

export async function POST(req) {
  try {
    const { password, templates } = await req.json();

    // Verify password
    if (password !== API_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    if (!Array.isArray(templates)) {
      return NextResponse.json(
        { error: "Templates must be an array" },
        { status: 400 }
      );
    }

    const results = [];

    // Process each template request
    for (const template of templates) {
      const { prompt, complexity, length } = template;

      if (!prompt) {
        results.push({
          error: "Document name (prompt) is required",
          template,
        });
        continue;
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

      try {
        const completion = await openai.chat.completions.create({
          model: "chatgpt-4o-latest",
          messages: [
            {
              role: "system",
              content: `You are a legal document template generator. You must respond with valid JSON only. Your response must contain two primary objects:

1. **Document Details** (use key "Document Details" with a space):
   - "title" (string): A concise name for the template
   - "description" (string): A single-sentence brief explanation of the template's purpose (max 100 characters)
   - "ideal_for" (array): Array of target users from these options only: ["Individuals", "Startups", "SMBs", "Enterprises", "General"]
   - "content" (string): The main body of the template in Markdown format. Always use {{JURISDICTION}} as a placeholder and include other generic placeholders like {{CURRENCY}}, {{COMPANY_NAME}}, {{EFFECTIVE_DATE}}, etc.

2. **Placeholders**:
   - A list of all placeholders used in the "content" field. Each placeholder must be represented as an object with:
      - "name" (string): The exact name of the placeholder (e.g., "JURISDICTION")
      - "description" (string): A brief description of what this placeholder represents
      - "format" (object): Specifies the input format with properties:
         - "type": One of "text", "date", "currency", "number", "email", "phone"
         - "currency": Required if type is "currency"
         - "pattern": Optional regex pattern for validation
      - "signer" (boolean): **Optional**, include only if the placeholder represents a signing party's name

Important: Do not include any signature blocks, signature lines, or signature sections in the document content. These will be handled separately by the system.

Note: Always include JURISDICTION as a required placeholder.

The document should be between ${wordCountRanges[length || 3].min} and ${wordCountRanges[length || 3].max} words.
Complexity Level: ${complexityLevels[complexity || 3]}`,
            },
            {
              role: "user",
              content: `Generate a template for: ${prompt}`,
            },
          ],
          temperature: 0.3,
        });

        console.log("OpenAI response received"); // Debug log

        const response = completion.choices[0].message.content;
        const cleanedResponse = response
          .trim()
          .replace(/[\n\r]/g, " ")
          .replace(/^```json\s*|\s*```$/g, "");

        console.log("Cleaned response:", cleanedResponse); // Debug log

        const parsedResponse = JSON.parse(cleanedResponse);

        console.log("Parsed response:", parsedResponse); // Debug log

        // Insert template into database
        const { data: insertedTemplate, error: insertError } = await supabase
          .from("templates")
          .insert([
            {
              template_name: parsedResponse["Document Details"].title,
              ideal_for: parsedResponse["Document Details"].ideal_for,
              description: parsedResponse["Document Details"].description,
              content: parsedResponse["Document Details"].content,
              placeholder_values: parsedResponse["Placeholders"],
              ai_gen_template: true,
              is_active: true,
              is_public: true,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Database insertion error:", insertError); // Debug log
          throw insertError;
        }

        console.log("Template inserted successfully:", insertedTemplate); // Debug log

        results.push({
          success: true,
          template: insertedTemplate,
        });
      } catch (error) {
        console.error("Error processing template:", error); // Debug log
        results.push({
          error: error.message,
          template,
        });
      }
    }

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate templates",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
