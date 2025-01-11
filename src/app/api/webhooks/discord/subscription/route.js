export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { eventType, table, new: newData, old: oldData } = req.body;

    // Default message setup
    let messageContent = `**New Event Triggered:** ${eventType} in table \`${table}\``;
    let embedTitle = `Supabase Event: ${eventType}`;
    let embedDescription = "Database update detected in Supabase.";
    let embedColor = 0x00ff00; // Default green

    // Customize for subscription events
    if (table === "subscriptions") {
      const statusEmojis = {
        active: "✅",
        trialing: "🔄",
        canceled: "❌",
        incomplete: "⚠️",
        past_due: "💸",
        unpaid: "💢",
      };

      const emoji = statusEmojis[newData.status] || "ℹ️";

      if (eventType === "INSERT") {
        messageContent = `${emoji} **New Subscription Created!**`;
        embedTitle = "New Subscription";
        embedDescription = `A new subscription has been created with status: ${newData.status}`;
      } else if (eventType === "UPDATE" && oldData.status !== newData.status) {
        messageContent = `${emoji} **Subscription Status Changed**`;
        embedTitle = "Subscription Updated";
        embedDescription = `Subscription status changed from ${oldData.status} to ${newData.status}`;
        embedColor = newData.status === "active" ? 0x00ff00 : 0xff9900;
      }
    }

    // Prepare the payload for Discord
    const discordPayload = {
      content: messageContent,
      embeds: [
        {
          title: embedTitle,
          description: embedDescription,
          color: embedColor,
          fields: [
            {
              name: "Subscription Details",
              value: newData
                ? `🆔 Subscription ID: ${newData.id}\n` +
                  `📊 Status: ${newData.status}\n` +
                  `🔄 Renewal Date: ${new Date(newData.current_period_end).toLocaleDateString()}\n` +
                  `🛑 Cancel at Period End: ${newData.cancel_at_period_end ? "Yes" : "No"}`
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
