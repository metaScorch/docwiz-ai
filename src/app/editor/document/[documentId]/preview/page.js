"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PDFPreview from "@/components/PDFPreview";

export default function PreviewPage({ params }) {
  const documentId = params.documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [signers, setSigners] = useState([]);
  const [signerEmails, setSignerEmails] = useState({});

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

      // Process placeholder_values to find signers
      if (document.placeholder_values) {
        const signerFields = document.placeholder_values.filter(
          (field) => field.signer
        );
        setSigners(signerFields);
        
        // Initialize email state
        const initialEmails = {};
        signerFields.forEach((signer) => {
          initialEmails[signer.name] = "";
        });
        setSignerEmails(initialEmails);
      }
    }

    fetchDocument();
  }, [documentId, supabase]);

  const handleEmailChange = (signerName, email) => {
    setSignerEmails((prev) => ({
      ...prev,
      [signerName]: email,
    }));
  };

  const handleSendForSigning = async () => {
    // Implement your signing service integration here
    console.log("Sending for signing:", signerEmails);
  };

  if (!document) return <div>Loading...</div>;

  // Convert placeholder_values array to object format expected by PDFPreview
  const placeholderValuesObj = document.placeholder_values?.reduce((acc, curr) => {
    acc[curr.name] = {
      value: curr.value,
      signer: curr.signer,
      description: curr.description
    };
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 h-[800px] overflow-hidden">
          <PDFPreview 
            content={document.content}
            placeholderValues={placeholderValuesObj}
          />
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-2xl font-bold mb-6">Signing Details</h2>
          
          {signers.map((signer) => (
            <div key={signer.name} className="mb-4">
              <Label htmlFor={signer.name}>{signer.description}</Label>
              <Input
                id={signer.name}
                type="email"
                placeholder="Enter email address"
                value={signerEmails[signer.name]}
                onChange={(e) => handleEmailChange(signer.name, e.target.value)}
              />
            </div>
          ))}

          <div className="mt-6 space-x-4">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={handleSendForSigning}>
              Send for Signing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
