import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create a Supabase client without auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

// Add GET method for webhook verification
export async function GET(request) {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request) {
  console.log("Webhook received:", new Date().toISOString());
  try {
    // 1. Get webhook data first
    const webhookData = await request.json();
    console.log("Webhook data:", webhookData);

    const { event, data } = webhookData;
    const documentId = data.object.id;

    // 2. Find the document using the SignWell ID
    const { data: userDocument, error: fetchError } = await supabase
      .from("user_documents")
      .select("*")
      .eq("document->>signwellId", documentId)
      .single();

    if (fetchError) {
      console.error("Error fetching document:", fetchError);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Prepare the signing tracking entry
    const trackingEntry = {
      event_type: event.type,
      timestamp: new Date(event.time * 1000).toISOString(),
      signer: event.related_signer || null,
      event_data: data.object,
    };

    // Update document status based on event type
    let documentStatus = userDocument.document.documentStatus;
    let signers = userDocument.document.signers;

    switch (event.type) {
      case "document_viewed":
        // Update signer status when document is viewed
        if (event.related_signer) {
          signers = signers.map((signer) =>
            signer.email === event.related_signer.email
              ? { ...signer, status: "viewed" }
              : signer
          );
        }
        break;

      case "document_signed":
        // Update individual signer status
        if (event.related_signer) {
          signers = signers.map((signer) =>
            signer.email === event.related_signer.email
              ? { ...signer, status: "signed" }
              : signer
          );
        }
        break;

      case "document_completed":
        documentStatus = "completed";
        signers = signers.map((signer) => ({ ...signer, status: "signed" }));

        // Fetch the completed PDF
        const response = await fetch(
          `https://www.signwell.com/api/v1/documents/${documentId}/completed_pdf/`,
          {
            headers: {
              "X-Api-Key": process.env.SIGNWELL_API_KEY,
            },
          }
        );

        if (response.ok) {
          const pdfBlob = await response.blob();
          const fileName = `agreements/${userDocument.id}/signed_${Date.now()}.pdf`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } =
            await supabase.storage.from("documents").upload(fileName, pdfBlob, {
              contentType: "application/pdf",
            });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("documents").getPublicUrl(fileName);

            // Add signed PDF URL to document data
            userDocument.document.signedPdfUrl = publicUrl;
          }
        }
        break;

      case "document_declined":
        documentStatus = "declined";
        if (event.related_signer) {
          signers = signers.map((signer) =>
            signer.email === event.related_signer.email
              ? { ...signer, status: "declined" }
              : signer
          );
        }
        break;

      case "document_expired":
        documentStatus = "expired";
        break;

      case "document_canceled":
        documentStatus = "canceled";
        break;
    }

    // Update the user document with new status and tracking information
    const { error: updateError } = await supabase
      .from("user_documents")
      .update({
        status: documentStatus,
        document: {
          ...userDocument.document,
          documentStatus,
          signers,
          lastUpdated: new Date().toISOString(),
        },
        signing_tracking: [
          ...(userDocument.signing_tracking || []),
          trackingEntry,
        ],
      })
      .eq("id", userDocument.id);

    if (updateError) {
      console.error("Error updating document:", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
