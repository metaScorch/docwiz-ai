import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Parse the incoming request from Supabase
    const body = await req.json();
    const { eventType, table, new: newData, old: oldData } = body;

    // Customize message for user signups
    let messageContent = `**New Event Triggered:** ${eventType} in table \`${table}\``;
    let embedTitle = `Supabase Event: ${eventType}`;
    let embedDescription = "Database update detected in Supabase.";

    if (table === "users" && eventType === "INSERT") {
      messageContent = `🎉 **New User Signup!**`;
      embedTitle = "New User Registration";
      embedDescription = `Welcome to our newest member${newData.full_name ? ` ${newData.full_name}` : ""}!`;
    }

    // Prepare the payload for Discord
    const discordPayload = {
      content: messageContent,
      embeds: [
        {
          title: embedTitle,
          description: embedDescription,
          color: 0x00ff00, // Green color for success
          fields: [
            {
              name: "User Details",
              value: newData
                ? `📧 Email: ${newData.email}\n${newData.full_name ? `👤 Name: ${newData.full_name}\n` : ""}📅 Joined: ${new Date().toLocaleDateString()}`
                : "N/A",
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send the payload to Discord
    const response = await fetch(
      "https://discord.com/api/webhooks/1326505079452336208/rn4jEaQdb2amYDoPLCQ1croPO3-iIciwICI9JJQPkABnR3JuBFNW_yf7zUsuVzOjpzQE",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discordPayload),
      }
    );

    // Handle Discord response
    if (!response.ok) {
      const errorMessage = await response.text();
      console.error("Discord webhook error:", errorMessage);
      return NextResponse.json(
        { error: "Failed to send webhook to Discord" },
        { status: 500 }
      );
    }

    // Respond to Supabase
    return NextResponse.json(
      { message: "Webhook successfully forwarded to Discord" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
