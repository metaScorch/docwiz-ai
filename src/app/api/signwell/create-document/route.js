import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { fileUrl, documentName, signers, sender } = body;

    // Create message based on sender availability
    const message =
      sender?.name && sender?.email
        ? `${sender.name} (${sender.email}) sent you a document for signing.`
        : "You've received a document for signing.";

    // Log the request for debugging
    console.log("SignWell Request:", {
      fileUrl,
      documentName,
      signers,
      sender,
    });

    // Log the full signers data to debug fields
    console.log("Signers with fields:", JSON.stringify(signers, null, 2));

    console.log("Received signers:", signers);

    // Before creating signwellPayload, validate fields
    let hasValidFields = false;
    signers.forEach((signer, index) => {
      if (
        !signer.fields ||
        !Array.isArray(signer.fields) ||
        signer.fields.length === 0
      ) {
        console.warn(
          `Warning: No valid fields found for signer ${index + 1}:`,
          signer
        );
      } else {
        // Validate each field has required properties
        const validFieldsExist = signer.fields.every(
          (field) =>
            field.page &&
            typeof field.x === "number" &&
            typeof field.y === "number"
        );
        if (validFieldsExist) {
          hasValidFields = true;
          console.log(
            `Valid fields found for signer ${index + 1}:`,
            signer.fields
          );
        } else {
          console.warn(
            `Invalid field format for signer ${index + 1}:`,
            signer.fields
          );
        }
      }
    });

    if (!hasValidFields) {
      console.log(
        "No signature fields specified - using signature page instead"
      );
    }

    const signwellPayload = {
      test_mode: false,
      files: [
        {
          file_url: fileUrl,
          name: `${documentName}.pdf`,
        },
      ],
      name: documentName,
      subject: documentName,
      message: message,
      recipients: signers.map((signer, index) => ({
        id: `recipient_${index + 1}`,
        name: signer.name,
        email: signer.email,
        order: index + 1,
        role: "signer",
        message: message,
      })),
      draft: false,
      reminders: true,
      apply_signing_order: false,
      embedded_signing: false,
      embedded_signing_notifications: false,
      text_tags: false,
      allow_decline: true,
      allow_reassign: true,
      with_signature_page: true,
    };

    // Log the final payload for verification
    console.log(
      "Final SignWell Payload:",
      JSON.stringify(signwellPayload, null, 2)
    );

    // Right before the fetch call
    console.log("Final stringified payload:", JSON.stringify(signwellPayload));

    const response = await fetch("https://www.signwell.com/api/v1/documents/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.SIGNWELL_API_KEY,
      },
      body: JSON.stringify(signwellPayload),
    });

    const data = await response.json();

    // Log the SignWell response
    console.log("SignWell Response:", data);

    if (!response.ok) {
      // Extract and format detailed error messages
      const errorMessages = [];
      if (data.errors) {
        Object.entries(data.errors).forEach(([category, errors]) => {
          Object.entries(errors).forEach(([key, messages]) => {
            errorMessages.push(
              `${category} (${key}): ${JSON.stringify(messages)}`
            );
          });
        });
      }
      throw new Error(
        `SignWell API error: ${errorMessages.length ? errorMessages.join("; ") : "Unknown error"}`
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("SignWell API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create document" },
      { status: 500 }
    );
  }
}
