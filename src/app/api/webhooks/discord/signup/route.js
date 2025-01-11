export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Parse the incoming request from Supabase
    const { eventType, table, new: newData, old: oldData } = req.body;

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
      "https://discord.com/api/webhooks/1327533270681784362/zG--lqojygCw41Cwa7Jtuc9l6d8SqL89hTxpxYFDXIf0z1lh4hn_x57lbv4pEimqu9Wf",
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
      return res
        .status(500)
        .json({ error: "Failed to send webhook to Discord" });
    }

    // Respond to Supabase
    res
      .status(200)
      .json({ message: "Webhook successfully forwarded to Discord" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
