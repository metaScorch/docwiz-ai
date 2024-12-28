"use client";

import { useEffect, useState, use } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PDFPreview from "@/components/PDFPreview";
import { toast } from "sonner";

export default function PreviewPage({ params }) {
  const documentId = use(params).documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [signers, setSigners] = useState([]);
  const [signerEmails, setSignerEmails] = useState({});

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

      // Extract signers with their values
      if (document.placeholder_values) {
        const signerFields = document.placeholder_values.filter(
          (field) => field.signer === true
        );
        setSigners(signerFields);

        // Initialize email state with existing emails if available
        const initialEmails = {};
        signerFields.forEach((signer) => {
          initialEmails[signer.name] = signer.email || "";
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
    try {
      // Validate all emails are provided and valid
      const invalidEmails = Object.entries(signerEmails).some(
        ([_, email]) => !email || !emailRegex.test(email)
      );

      if (invalidEmails) {
        toast.error("Please provide valid email addresses for all signers");
        return;
      }

      // Update placeholder_values with emails
      const updatedPlaceholderValues = document.placeholder_values.map(
        (field) => {
          if (field.signer) {
            return { ...field, email: signerEmails[field.name] };
          }
          return field;
        }
      );

      // Update document status and placeholder_values
      const { error: updateError } = await supabase
        .from("user_documents")
        .update({
          status: "pending_signature",
          placeholder_values: updatedPlaceholderValues,
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      toast.success("Document sent for signing!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error sending document for signing:", error);
      toast.error("Failed to send document for signing");
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
            >
              Send for Signing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
