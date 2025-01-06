"use client";

import { useEffect, useState, use } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PDFPreview from "@/components/PDFPreview";
import { toast } from "sonner";
import {
  generatePreviewPDF,
  generateSignwellPDF,
} from "@/components/PDFGenerator";
import { Loader2 } from "lucide-react";

export default function PreviewPage({ params }) {
  const documentId = use(params).documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [signers, setSigners] = useState([]);
  const [signerEmails, setSignerEmails] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Add email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    async function fetchDocument() {
      const { data: document, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) {
        console.error("Error fetching document:", error);
        return;
      }

      setDocument(document);

      // Ensure placeholder_values is parsed if it's a string
      const placeholderValues =
        typeof document.placeholder_values === "string"
          ? JSON.parse(document.placeholder_values)
          : document.placeholder_values;

      if (Array.isArray(placeholderValues)) {
        console.log("Fetched placeholder values:", placeholderValues);

        // Find fields marked as signers
        const signerFields = placeholderValues.filter(
          (field) => field.signer === true
        );
        console.log("Extracted signer fields:", signerFields);

        setSigners(signerFields);

        // Initialize email state for signers
        const initialEmails = {};
        signerFields.forEach((signer) => {
          initialEmails[signer.name] = ""; // Initialize empty email for each signer
        });
        setSignerEmails(initialEmails);
      }
    }

    fetchDocument();
  }, [documentId, supabase]);

  const handleEmailChange = (signerName, email) => {
    // Simply update the email value without validation
    setSignerEmails((prev) => ({
      ...prev,
      [signerName]: email,
    }));
  };

  const handleSendForSigning = async () => {
    setIsProcessing(true);
    try {
      // Debug logs for placeholder values
      console.log("All placeholder values:", document.placeholder_values);

      // Log a sample placeholder value
      const signerPlaceholders = document.placeholder_values.filter(
        (field) => field.signer === true
      );
      console.log("Signer placeholders:", signerPlaceholders);

      // Validate emails
      const invalidEmails = Object.entries(signerEmails).some(
        ([_, email]) => !email || !emailRegex.test(email)
      );

      if (invalidEmails) {
        toast.error("Please provide valid email addresses for all signers");
        return;
      }

      // Update PDF generation to use generateSignwellPDF
      const pdfBlob = await generateSignwellPDF(
        document.content,
        document.placeholder_values
      );
      if (!pdfBlob) throw new Error("PDF generation failed");

      // 2. Upload to Supabase Storage
      const fileName = `agreements/${documentId}/${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName);

      // Add this before the SignWell API call
      const signersPayload = signers.map((signer, index) => {
        const signerFields = document.placeholder_values.filter(
          (field) => field.signer === true && field.name === signer.name
        );

        // Map the fields with their actual positions from placeholder_values
        const fields = signerFields.map((field) => ({
          type: "signature",
          x: field.x || 100,
          y: field.y || 100,
          page: field.page || 1,
          width: field.width || 120,
          height: field.height || 60,
        }));

        return {
          name: signer.value,
          email: signerEmails[signer.name],
          fields: fields,
        };
      });

      console.log("Final signers payload:", signersPayload);

      // Then use signersPayload in your API call
      const signwellResponse = await fetch("/api/signwell/create-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: publicUrl,
          documentName: document.title || "Untitled Document",
          signers: signersPayload,
        }),
      });

      if (!signwellResponse.ok) {
        const errorData = await signwellResponse.json();
        throw new Error(
          `SignWell Error: ${errorData.message || "Unknown error"}`
        );
      }

      const signwellData = await signwellResponse.json();

      // 5. Update document status and store agreement details
      const { error: updateError } = await supabase
        .from("user_documents")
        .update({
          status: "pending_signature",
          placeholder_values: document.placeholder_values.map((field) => {
            if (field.signer) {
              return { ...field, email: signerEmails[field.name] };
            }
            return field;
          }),
          document: {
            originalPdf: publicUrl,
            signwellId: signwellData.id,
            signers: Object.entries(signerEmails).map(([name, email]) => ({
              name,
              email,
              status: "pending",
            })),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            documentStatus: "pending_signature",
            signwellData: signwellData,
          },
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      toast.success("Document sent for signing!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to send document for signing");
    } finally {
      setIsProcessing(false);
    }
  };

  // Add new preview download handler
  const handlePreviewDownload = async () => {
    try {
      const pdfBlob = await generatePreviewPDF(
        document.content,
        document.placeholder_values
      );

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${document.title || "document"}_preview.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading preview:", error);
      toast.error("Failed to download preview");
    }
  };

  if (!document) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <div className="mb-4">
            <Button
              onClick={handlePreviewDownload}
              variant="outline"
              className="w-full"
            >
              Download Preview
            </Button>
          </div>
          <PDFPreview
            content={document.content}
            placeholderValues={document.placeholder_values}
            signers={signers}
          />
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-8">Signing Details</h2>

          {signers.map((signer, index) => (
            <div key={signer.name}>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {signer.value}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {signer.description}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={signer.name} className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id={signer.name}
                    type="email"
                    placeholder="Enter email address"
                    value={signerEmails[signer.name]}
                    onChange={(e) =>
                      handleEmailChange(signer.name, e.target.value)
                    }
                    className={`${
                      !emailRegex.test(signerEmails[signer.name]) &&
                      signerEmails[signer.name]
                        ? "border-red-500 focus:ring-red-500"
                        : "focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>

              {/* Add divider if not the last signer */}
              {index < signers.length - 1 && (
                <div className="border-b border-gray-200 mb-6" />
              )}
            </div>
          ))}

          <div className="mt-8 space-x-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="px-6"
            >
              Back
            </Button>
            <Button
              onClick={handleSendForSigning}
              className="px-6 bg-blue-600 hover:bg-blue-700"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Send for Signing"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
