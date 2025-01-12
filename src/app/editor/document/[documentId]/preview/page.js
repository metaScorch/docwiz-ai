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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { posthog } from "@/lib/posthog";

export default function PreviewPage({ params }) {
  const documentId = use(params).documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [signers, setSigners] = useState([]);
  const [signerEmails, setSignerEmails] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [additionalSigners, setAdditionalSigners] = useState([]);
  const [user, setUser] = useState(null);

  // Add email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    async function fetchDocumentAndUser() {
      // Fetch document
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

      // Fetch user data from auth
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (!userError && currentUser) {
        setUser({
          email: currentUser.email,
          full_name:
            currentUser.user_metadata?.full_name ||
            currentUser.email.split("@")[0],
        });
      } else {
        console.error("Error fetching user:", userError);
      }

      // Process placeholder values
      if (document) {
        const placeholderValues =
          typeof document.placeholder_values === "string"
            ? JSON.parse(document.placeholder_values)
            : document.placeholder_values;

        if (Array.isArray(placeholderValues)) {
          console.log("Fetched placeholder values:", placeholderValues);

          const signerFields = placeholderValues.filter(
            (field) => field.signer === true
          );
          console.log("Extracted signer fields:", signerFields);

          setSigners(signerFields);

          const initialEmails = {};
          signerFields.forEach((signer) => {
            initialEmails[signer.name] = "";
          });
          setSignerEmails(initialEmails);
        }
      }
    }

    fetchDocumentAndUser();
  }, [documentId, supabase]);

  // Track page load
  useEffect(() => {
    if (document) {
      posthog.capture("document_preview_viewed", {
        document_id: documentId,
        has_signers: signers.length > 0,
        document_status: document.status,
      });
    }
  }, [document, documentId]);

  const handleEmailChange = (signerName, email) => {
    posthog.capture("signer_email_updated", {
      document_id: documentId,
      is_valid_email: emailRegex.test(email),
    });
    // Simply update the email value without validation
    setSignerEmails((prev) => ({
      ...prev,
      [signerName]: email,
    }));
  };

  const handleAddSigner = () => {
    setAdditionalSigners([
      ...additionalSigners,
      { name: "", email: "", value: "" },
    ]);

    posthog.capture("additional_signer_added", {
      document_id: documentId,
      total_signers: signers.length + additionalSigners.length + 1,
    });
  };

  const handleRemoveSigner = (index) => {
    const newSigners = [...additionalSigners];
    newSigners.splice(index, 1);
    setAdditionalSigners(newSigners);

    posthog.capture("additional_signer_removed", {
      document_id: documentId,
      total_signers: signers.length + newSigners.length,
    });
  };

  const handleAdditionalSignerChange = (index, field, value) => {
    const newSigners = [...additionalSigners];
    newSigners[index][field] = value;
    setAdditionalSigners(newSigners);
  };

  const handleSendForSigning = async () => {
    // Add validation to ensure user data is available
    if (!user || !user.email) {
      toast.error("User information not available. Please try again.");
      return;
    }

    const startTime = Date.now();

    posthog.capture("document_signing_started", {
      document_id: documentId,
      signer_count: signers.length,
      has_all_emails: Object.values(signerEmails).every(
        (email) => email && emailRegex.test(email)
      ),
    });

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

      // Validate additional signers
      const invalidAdditionalSigners = additionalSigners.some(
        (signer) =>
          !signer.name || !signer.email || !emailRegex.test(signer.email)
      );

      if (invalidAdditionalSigners) {
        toast.error(
          "Please provide valid name and email for all additional signers"
        );
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

      // Modify signers payload to include additional signers
      const signersPayload = [
        ...signers.map((signer) => ({
          name: signer.value,
          email: signerEmails[signer.name],
          fields: document.placeholder_values
            .filter(
              (field) => field.signer === true && field.name === signer.name
            )
            .map((field) => ({
              type: "signature",
              x: field.x || 100,
              y: field.y || 100,
              page: field.page || 1,
              width: field.width || 120,
              height: field.height || 60,
            })),
        })),
        ...additionalSigners.map((signer) => ({
          name: signer.name,
          email: signer.email,
          fields: [], // No predefined signature fields for additional signers
        })),
      ];

      console.log("Final signers payload:", signersPayload);

      // Then use signersPayload in your API call
      const signwellResponse = await fetch("/api/signwell/create-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: publicUrl,
          documentName: document.title || "Untitled Document",
          signers: signersPayload,
          sender: {
            name: user.full_name || user.email.split("@")[0],
            email: user.email,
          },
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
          placeholder_values: [
            ...document.placeholder_values.map((field) => {
              if (field.signer) {
                return { ...field, email: signerEmails[field.name] };
              }
              return field;
            }),
            ...additionalSigners.map((signer) => ({
              name: `additional_${signer.name}`,
              value: signer.name,
              email: signer.email,
              signer: true,
            })),
          ],
          document: {
            originalPdf: publicUrl,
            signwellId: signwellData.id,
            signers: [
              ...Object.entries(signerEmails).map(([name, email]) => ({
                name,
                email,
                status: "pending",
              })),
              ...additionalSigners.map((signer) => ({
                name: signer.name,
                email: signer.email,
                status: "pending",
              })),
            ],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            documentStatus: "pending_signature",
            signwellData: signwellData,
          },
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      posthog.capture("document_signing_completed", {
        document_id: documentId,
        processing_time: Date.now() - startTime,
        signer_count: signers.length,
        success: true,
      });

      toast.success("Document sent for signing!");
      router.push("/dashboard");
    } catch (error) {
      posthog.capture("document_signing_error", {
        document_id: documentId,
        error_message: error.message,
        processing_time: Date.now() - startTime,
      });
      console.error("Error:", error);
      toast.error(error.message || "Failed to send document for signing");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!document) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
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

          {/* Additional signers */}
          {additionalSigners.map((signer, index) => (
            <div
              key={`additional-${index}`}
              className="bg-gray-50 rounded-lg p-6 mb-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-4 w-full">
                  <div>
                    <Label htmlFor={`additional-name-${index}`}>Name</Label>
                    <Input
                      id={`additional-name-${index}`}
                      value={signer.name}
                      onChange={(e) =>
                        handleAdditionalSignerChange(
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="Enter signer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`additional-email-${index}`}>Email</Label>
                    <Input
                      id={`additional-email-${index}`}
                      type="email"
                      value={signer.email}
                      onChange={(e) =>
                        handleAdditionalSignerChange(
                          index,
                          "email",
                          e.target.value
                        )
                      }
                      placeholder="Enter email address"
                      className={
                        !emailRegex.test(signer.email) && signer.email
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSigner(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            onClick={handleAddSigner}
            variant="outline"
            className="w-full mt-4"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Another Signer
          </Button>

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
