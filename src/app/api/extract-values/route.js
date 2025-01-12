import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { prompt, businessContext, placeholders } = await req.json();

    const completion = await openai.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a value extraction specialist. Your task is to extract values for the provided placeholders by analyzing the prompt and business context.

Given a list of placeholders, you must:
1. Analyze the prompt and business context
2. Extract relevant values for each placeholder
3. Return a JSON object with placeholder names as keys and extracted values as values
4. Follow the format requirements for each placeholder (currency, number, text, etc.)
5. Leave the value as an empty string if it cannot be determined

Format Rules:
- Currency: Return numbers without currency symbols or commas (e.g., "180000" not "$180,000")
- Percentages: Return numbers without % symbol (e.g., "20" not "20%")
- Text: Return string values
- Dates: Use ISO format (YYYY-MM-DD)

IMPORTANT: Return only a valid JSON object, no markdown formatting or backticks.`,
        },
        {
          role: "user",
          content: `Extract values for the following placeholders:
${JSON.stringify(placeholders, null, 2)}

From this prompt:
${prompt}

And this business context:
${JSON.stringify(businessContext, null, 2)}`,
        },
      ],
      temperature: 0.1,
    });

    let content = completion.choices[0].message.content;

    content = content.replace(/```json\s*|\s*```/g, "").trim();

    try {
      const extractedValues = JSON.parse(content);
      return NextResponse.json(extractedValues);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response", details: parseError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to extract values", details: error.message },
      { status: 500 }
    );
  }
}
