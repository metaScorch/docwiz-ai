"use client";
import { useEffect, useState, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewAgreementForm } from "@/components/NewAgreementForm";
import { Loader2, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";

export default function AnonymousTemplatePage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [anonymousId, setAnonymousId] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [fuse, setFuse] = useState(null);

  // Initialize anonymous session
  useEffect(() => {
    const initAnonymousSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.signUp({
          email: null,
          password: null,
        });

        if (error) throw error;

        if (session) {
          setAnonymousId(session.user.id);
          // Set expiry 24 hours from now
          setSessionExpiry(new Date(Date.now() + 24 * 60 * 60 * 1000));

          // Store session info in localStorage
          localStorage.setItem(
            "anonymousSession",
            JSON.stringify({
              id: session.user.id,
              expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
          );
        }
      } catch (error) {
        console.error("Error creating anonymous session:", error);
        toast.error("Failed to initialize session");
      }
    };

    const storedSession = localStorage.getItem("anonymousSession");
    if (storedSession) {
      const { id, expiry } = JSON.parse(storedSession);
      if (new Date(expiry) > new Date()) {
        setAnonymousId(id);
        setSessionExpiry(new Date(expiry));
      } else {
        localStorage.removeItem("anonymousSession");
        initAnonymousSession();
      }
    } else {
      initAnonymousSession();
    }
  }, [supabase.auth]);

  // Fetch public templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from("templates")
          .select("*")
          .eq("is_public", true)
          .eq("is_active", true);

        if (error) throw error;
        setTemplates(data || []);

        // Initialize Fuse instance
        const fuseInstance = new Fuse(data || [], {
          keys: ["template_name", "description"],
          threshold: 0.3, // Adjust this value (0.0 - 1.0) to control strictness
          includeScore: true,
        });
        setFuse(fuseInstance);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [supabase]);

  // Replace the filteredTemplates definition with this
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    if (!fuse) return templates;

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, templates, fuse]);

  const handleTemplateSelect = async (templateId) => {
    try {
      // Create document for anonymous user
      const { data: document, error } = await supabase
        .from("user_documents")
        .insert([
          {
            template_id: templateId,
            anonymous_user_id: anonymousId,
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Redirect to editor
      router.push(`/editor/document/${document.id}`);
    } catch (error) {
      console.error("Error selecting template:", error);
      toast.error("Failed to create document");
    }
  };

  const timeUntilExpiry = () => {
    if (!sessionExpiry) return null;
    const now = new Date();
    const diff = sessionExpiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <Image
          src="/logo.png"
          alt="DocWiz Logo"
          width={180}
          height={60}
          priority
          className="h-auto"
        />
        <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
      </div>

      {/* Session Warning */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your session will expire in {timeUntilExpiry()}. Sign in to save your
          progress and access all features.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose a Template</CardTitle>
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-all"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <h3 className="font-medium">{template.template_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                    <div className="flex items-center text-primary text-sm mt-2">
                      Use Template
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Custom Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Describe your agreement needs and our AI will create a
                customized document for you.
              </p>
              <Button className="w-full" onClick={() => setShowAIDialog(true)}>
                Generate with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Custom Agreement</DialogTitle>
          </DialogHeader>
          <NewAgreementForm
            anonymousUserId={anonymousId}
            onComplete={() => setShowAIDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
