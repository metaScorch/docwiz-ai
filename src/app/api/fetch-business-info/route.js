import { NextResponse } from "next/server";
import { checkBusinessInfoRateLimit } from "@/utils/apiRateLimiter";

async function scrapeWebsite(domain) {
  const url = `https://${domain}`;
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl API error:", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(
        `Firecrawl API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (!data.success || !data.data || !data.data.markdown) {
      console.error("Invalid Firecrawl response:", data);
      throw new Error("Invalid response from Firecrawl API");
    }

    // Extract the markdown content
    const content = data.data.markdown;

    // If content is empty or just whitespace
    if (!content.trim()) {
      throw new Error("No content retrieved from website");
    }

    return content;
  } catch (error) {
    console.error("Error in scrapeWebsite:", {
      domain,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

async function generateSummaryAndIndustry(websiteContent, domain) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a business analyst who creates concise business descriptions and categorizes businesses.
          You must categorize the industry from only these options: Technology, Finance, Healthcare, Education, Retail, Other.`,
        },
        {
          role: "user",
          content: `Based on the following website content from ${domain}, provide:
          1. A concise 2-3 sentence business description focusing on their main business activities and value proposition
          2. The most appropriate industry category from the given options
          
          Format your response as JSON with "description" and "industry" keys.
          
          Content:
          ${websiteContent}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content.trim());
  return result;
}

export async function POST(req) {
  try {
    const { domain, userId } = await req.json();

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkBusinessInfoRateLimit(userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error,
          resetIn: rateLimitResult.resetIn,
          limit: rateLimitResult.limit,
          period: rateLimitResult.period,
        },
        { status: 429 }
      );
    }

    // Step 1: Scrape website content using Firecrawl
    const websiteContent = await scrapeWebsite(domain);

    if (!websiteContent) {
      throw new Error("Failed to fetch website content");
    }

    // Step 2: Generate summary and industry using GPT4o-mini
    const { description, industry } = await generateSummaryAndIndustry(
      websiteContent,
      domain
    );

    return NextResponse.json({
      description,
      industry,
      remaining: rateLimitResult.remaining,
    });
  } catch (error) {
    console.error("Error fetching business info:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch business information" },
      { status: 500 }
    );
  }
}
