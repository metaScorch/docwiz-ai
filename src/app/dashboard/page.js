"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewAgreementForm } from "@/components/NewAgreementForm";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  format,
  isThisWeek,
  isThisYear,
} from "date-fns";
import Image from "next/image";
import { Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, CreditCard, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { checkDocumentLimit } from "@/utils/usageLimits";
import { toast } from "sonner";
import { Toaster } from "sonner";
import Link from "next/link";
import { posthog } from "@/lib/posthog";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_signature", label: "Pending Signature" },
  { value: "completed", label: "Completed" },
];

// Define PartiesDialog as a separate component
const PartiesDialog = ({
  open,
  onOpenChange,
  parties,
  searchQuery,
  onSearchChange,
  formatRelativeTime,
  router,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[900px] max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>Document Parties</DialogTitle>
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Search by name, email, or document title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </DialogHeader>
      <ScrollArea className="h-[60vh]">
        {parties.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No parties found matching your search.
          </div>
        ) : (
          parties.map((party) => (
            <Card key={party.email} className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  {party.name} ({party.email})
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total Documents: {party.documents.length}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {["draft", "pending_signature", "completed"].map(
                      (status) => (
                        <div key={status} className="text-sm">
                          <div className="font-medium">
                            {status === "pending_signature"
                              ? "Pending Signature"
                              : status === "draft"
                                ? "Draft"
                                : "Completed"}
                          </div>
                          <div>
                            {
                              party.documents.filter(
                                (doc) => doc.status === status
                              ).length
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {party.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.title}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                doc.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : doc.status === "completed" ||
                                      doc.status === "signed"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : doc.status === "pending_signature"
                                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                                      : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}
                            >
                              {doc.status === "pending_signature"
                                ? "Pending Signature"
                                : doc.status === "draft"
                                  ? "Draft"
                                  : doc.status === "completed" ||
                                      doc.status === "signed"
                                    ? "Completed"
                                    : doc.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatRelativeTime(doc.created_at)}
                          </TableCell>
                          <TableCell>
                            {formatRelativeTime(doc.updated_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/editor/document/${doc.id}`)
                              }
                            >
                              {doc.status === "draft" ? "Edit" : "View"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

// Add new SignedDocumentsDialog component after PartiesDialog
const SignedDocumentsDialog = ({
  open,
  onOpenChange,
  documents,
  searchQuery,
  onSearchChange,
  formatRelativeTime,
}) => {
  const router = useRouter();

  const handleViewDocument = (doc) => {
    router.push(`/editor/document/${doc.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Signed Documents</DialogTitle>
          <div className="mt-4">
            <Input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No signed documents found matching your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      {doc.template?.template_name || "Custom Document"}
                    </TableCell>
                    <TableCell>{formatRelativeTime(doc.created_at)}</TableCell>
                    <TableCell>{formatRelativeTime(doc.updated_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    signedDocuments: 0,
    totalParties: 0,
  });
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [userDocuments, setUserDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [uniqueParties, setUniqueParties] = useState([]);
  const [showPartiesDialog, setShowPartiesDialog] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showSignedDocsDialog, setShowSignedDocsDialog] = useState(false);
  const [signedDocsSearchQuery, setSignedDocsSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingTemplateCheck, setLoadingTemplateCheck] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  // Separate the data fetching into smaller, focused functions
  const fetchDocuments = async (user_id) => {
    const { data, error } = await supabase
      .from("user_documents")
      .select(
        `
        *,
        template:templates(template_name)
      `
      )
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchRegistrations = async (user_id) => {
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  useEffect(() => {
    async function fetchDocumentsAndSubscription() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        console.log("Current user ID:", session.user.id);

        // Get all registrations for the user, ordered by creation date
        const { data: registrations, error: regError } = await supabase
          .from("registrations")
          .select("id, status, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        console.log("Registrations:", registrations);

        if (regError) {
          console.error("Registration error:", regError);
          return;
        }

        // If no registrations exist at all, redirect to complete-signup
        if (!registrations || registrations.length === 0) {
          console.log("No registrations found, redirecting to complete-signup");
          router.push("/complete-signup");
          return;
        }

        // Use the most recent registration
        const latestRegistration = registrations[0];
        console.log("Using latest registration:", latestRegistration);

        // Check subscription status using the latest registration
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("registration_id", latestRegistration.id)
          .maybeSingle();

        // Set subscription status for limit checking
        const hasActiveSubscription = subscription?.status === "active";

        try {
          // Only fetch limit data if no active subscription
          if (!hasActiveSubscription) {
            const limitData = await checkDocumentLimit(session.user.id);
            setLimitData(limitData);
            if (!limitData.allowed) {
              setShowUpgrade(true);
            }
          }
        } catch (limitError) {
          console.error("Error checking limits:", limitError);
          // Continue loading dashboard even if limit check fails
        }

        // Fetch documents
        const { data: documents } = await supabase
          .from("user_documents")
          .select("*, template:template_id(*)")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });

        if (documents) {
          setUserDocuments(documents);
          setFilteredDocuments(documents);

          // Calculate and update stats
          const totalDocs = documents.length;
          const signedDocs = documents.filter(
            (doc) => doc.status === "completed" || doc.status === "signed"
          ).length;

          // Count unique parties from documents
          const uniqueParties = new Set();
          documents.forEach((doc) => {
            const signers = doc.document?.signers || [];
            signers.forEach((signer) => {
              uniqueParties.add(signer.email);
            });
          });

          // Update stats
          setStats({
            totalDocuments: totalDocs,
            signedDocuments: signedDocs,
            totalParties: uniqueParties.size,
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchDocumentsAndSubscription();
  }, [router, supabase]);

  // Add useEffect to handle document filtering
  useEffect(() => {
    const filtered = userDocuments.filter((doc) => {
      const matchesSearch = Object.values({
        title: doc.title || "",
        description: doc.description || "",
      }).some((value) =>
        value.toLowerCase().includes(documentSearchQuery.toLowerCase())
      );

      const matchesStatus =
        selectedStatus === "all" ||
        doc.status === selectedStatus ||
        (selectedStatus === "completed" && doc.status === "signed");

      return matchesSearch && matchesStatus;
    });

    setFilteredDocuments(filtered);
    posthog.capture("documents_filtered", {
      filter_status: selectedStatus,
      search_query: documentSearchQuery,
      results_count: filtered.length,
    });
  }, [userDocuments, documentSearchQuery, selectedStatus]);

  // Helper function to process document stats
  const processDocumentStats = (documents) => {
    const totalDocs = documents.length;
    const signedDocs = documents.filter(
      (doc) => doc.status === "completed" || doc.status === "signed"
    ).length;

    return {
      totalDocuments: totalDocs,
      signedDocuments: signedDocs,
      totalParties: 0, // Will be updated when parties data is processed
    };
  };

  // Helper function to process parties data
  const processPartiesData = (documents) => {
    const parties = new Map();

    documents.forEach((doc) => {
      const signers = doc.document?.signers || [];
      signers.forEach((signer) => {
        if (!parties.has(signer.email)) {
          parties.set(signer.email, {
            name: signer.name,
            email: signer.email,
            documents: [],
          });
        }

        parties.get(signer.email).documents.push({
          id: doc.id,
          title: doc.title,
          status: doc.status,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        });
      });
    });

    // Update stats with total parties
    setStats((prev) => ({
      ...prev,
      totalParties: parties.size,
    }));

    return Array.from(parties.values());
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*, placeholder_values")
        .eq("ai_gen_template", true)
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Filter templates based on search
  const filteredTemplates = templates.filter((template) =>
    Object.values({
      template_name: template.template_name,
      ideal_for: template.ideal_for,
      description: template.description,
    }).some((value) =>
      value?.toLowerCase().includes(templateSearchQuery.toLowerCase())
    )
  );

  // Update the helper function
  function formatRelativeTime(dateStr) {
    try {
      const date = new Date(dateStr);

      if (isToday(date)) {
        const distance = formatDistanceToNow(date, { addSuffix: false });
        return distance === "less than a minute"
          ? "just now"
          : `${distance} ago`;
      }

      if (isYesterday(date)) {
        return "yesterday";
      }

      if (isThisWeek(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      }

      if (isThisYear(date)) {
        return format(date, "MMM d");
      }

      return format(date, "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  }

  const filteredParties = uniqueParties.filter((party) => {
    const searchTerm = partySearchQuery.toLowerCase();
    if (
      party.name.toLowerCase().includes(searchTerm) ||
      party.email.toLowerCase().includes(searchTerm)
    ) {
      return true;
    }
    return party.documents.some((doc) =>
      doc.title.toLowerCase().includes(searchTerm)
    );
  });

  const filteredSignedDocuments = userDocuments.filter((doc) => {
    const isSignedOrCompleted =
      doc.status === "signed" || doc.status === "completed";
    if (!isSignedOrCompleted) return false;

    return Object.values({
      title: doc.title || "",
      description: doc.description || "",
    }).some((value) =>
      value.toLowerCase().includes(signedDocsSearchQuery.toLowerCase())
    );
  });

  // Update the template selection and limit check
  const handleTemplateClick = async (template) => {
    setLoadingTemplateId(template.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First get user's registration
      const { data: registration } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!registration) return;

      // Check subscription status using registration_id
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("registration_id", registration.id)
        .single();

      // Set subscription status for limit checking
      const hasActiveSubscription = subscription?.status === "active";

      // Only check limits if no active subscription
      if (!hasActiveSubscription) {
        const limitData = await checkDocumentLimit(user.id);
        setLimitData(limitData);
        if (!limitData.allowed) {
          setShowTemplateDialog(false);
          setShowUpgrade(true);
          return;
        }
      }

      const { data: newDocument, error } = await supabase
        .from("user_documents")
        .insert([
          {
            user_id: user.id,
            template_id: template.id,
            content: template.content,
            title: template.template_name,
            status: "draft",
            placeholder_values: template.placeholder_values,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setShowTemplateDialog(false);
      router.push(`/editor/document/${newDocument.id}`);
      posthog.capture("template_selected", {
        template_id: template.id,
        template_name: template.template_name,
        user_id: user.id,
      });
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Failed to create document");
    } finally {
      setLoadingTemplateId(null);
    }
  };

  useEffect(() => {
    if (limitData) {
      console.log("limitData updated:", limitData);
    }
  }, [limitData]); // Only run when limitData changes

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Toaster />
      {isLoadingBilling && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading billing details...
            </p>
          </div>
        </div>
      )}
      <div className="container mx-auto p-6 space-y-6">
        {/* Logo and Account Section */}
        <div className="flex justify-between items-center mb-8">
          <Image
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                My Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2"
              >
                <UserCircle className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  setIsLoadingBilling(true);
                  try {
                    const {
                      data: { session },
                    } = await supabase.auth.getSession();

                    if (!session) {
                      console.error("No session found");
                      router.push("/sign-in");
                      return;
                    }

                    // Get user's registration
                    const { data: registration, error: regError } =
                      await supabase
                        .from("registrations")
                        .select("id, stripe_customer_id")
                        .eq("user_id", session.user.id)
                        .maybeSingle();

                    // Handle case where no registration exists
                    if (!registration || regError) {
                      console.log(
                        "No registration found or error occurred:",
                        regError
                      );
                      router.push("/pricing");
                      return;
                    }

                    // Check subscription status using registration_id
                    const { data: subscription, error: subError } =
                      await supabase
                        .from("subscriptions")
                        .select("status, stripe_subscription_id")
                        .eq("registration_id", registration.id)
                        .maybeSingle();

                    console.log("Subscription data:", subscription);

                    // If subscribed with Stripe subscription, open customer portal
                    if (
                      subscription?.status === "active" &&
                      subscription?.stripe_subscription_id
                    ) {
                      const response = await fetch(
                        "/api/create-billing-portal",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                        }
                      );

                      if (!response.ok) {
                        throw new Error(
                          `HTTP error! status: ${response.status}`
                        );
                      }

                      const { session_url, error } = await response.json();
                      if (error) throw new Error(error);

                      window.location.href = session_url;
                    } else {
                      // If not subscribed or no Stripe subscription, open pricing page
                      router.push("/pricing");
                    }
                  } catch (error) {
                    console.error("Error handling billing:", error);
                    toast.error("Failed to access billing portal");
                    router.push("/pricing");
                  } finally {
                    setIsLoadingBilling(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/sign-in");
                }}
                className="text-red-600 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer"
              onClick={() => setShowSignedDocsDialog(true)}
            >
              <CardTitle className="text-sm font-medium">
                Signed Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold cursor-pointer"
                onClick={() => setShowSignedDocsDialog(true)}
              >
                {stats.signedDocuments}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer"
              onClick={() => setShowPartiesDialog(true)}
            >
              <CardTitle className="text-sm font-medium">
                Total Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold cursor-pointer"
                onClick={() => setShowPartiesDialog(true)}
              >
                {stats.totalParties}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-4 items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#0700c7] text-white hover:bg-[#0700c7]/90">
                <Wand2 className="mr-1 h-4 w-2" />
                Generate Agreement Using AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Agreement</DialogTitle>
              </DialogHeader>
              <NewAgreementForm />
            </DialogContent>
          </Dialog>
          <div className="text-muted-foreground">or</div>
          <Dialog
            open={showTemplateDialog}
            onOpenChange={setShowTemplateDialog}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-white text-[#0700c7] border-[#0700c7] hover:bg-[#0700c7]/10"
                onClick={fetchTemplates}
              >
                Select A Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[900px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-xl mb-4">
                  Select A Template To Customize
                </DialogTitle>
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </DialogHeader>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <div className="max-h-[50vh] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-[200px]">
                            Template Name
                          </TableHead>
                          <TableHead className="w-[200px]">Ideal For</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">
                              {template.template_name}
                            </TableCell>
                            <TableCell>
                              {JSON.parse(template.ideal_for).join(", ")}
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate">
                              {template.description}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTemplateClick(template)}
                                disabled={loadingTemplateId === template.id}
                              >
                                {loadingTemplateId === template.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Select"
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredTemplates.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground"
                            >
                              No templates found matching your search.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 mt-2">
                {STATUS_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant="outline"
                    size="sm"
                    className={`${
                      selectedStatus === filter.value
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedStatus(filter.value)}
                  >
                    {filter.value !== "all" && (
                      <span
                        className={`mr-2 h-2 w-2 rounded-full ${
                          filter.value === "draft"
                            ? "bg-yellow-500"
                            : filter.value === "pending_signature"
                              ? "bg-blue-500"
                              : filter.value === "completed"
                                ? "bg-green-500"
                                : "bg-gray-500"
                        }`}
                      />
                    )}
                    {filter.label}
                  </Button>
                ))}
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={documentSearchQuery}
                  onChange={(e) => setDocumentSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      {doc.template?.template_name || "Custom Document"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : doc.status === "completed" ||
                                doc.status === "signed"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : doc.status === "pending_signature"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {doc.status === "pending_signature"
                          ? "Pending Signature"
                          : doc.status === "draft"
                            ? "Draft"
                            : doc.status === "completed" ||
                                doc.status === "signed"
                              ? "Completed"
                              : doc.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(doc.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(doc.updated_at || doc.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/editor/document/${doc.id}`)
                        }
                      >
                        {doc.status === "draft" ? "Edit" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No documents found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <PartiesDialog
          open={showPartiesDialog}
          onOpenChange={setShowPartiesDialog}
          parties={filteredParties}
          searchQuery={partySearchQuery}
          onSearchChange={setPartySearchQuery}
          formatRelativeTime={formatRelativeTime}
          router={router}
        />

        <SignedDocumentsDialog
          open={showSignedDocsDialog}
          onOpenChange={setShowSignedDocsDialog}
          documents={filteredSignedDocuments}
          searchQuery={signedDocsSearchQuery}
          onSearchChange={setSignedDocsSearchQuery}
          formatRelativeTime={formatRelativeTime}
        />

        {limitData && limitData.current !== undefined && (
          <div className="text-sm text-muted-foreground mb-2">
            You have used {limitData.current} out of {limitData.limit} documents
            this month.{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              Upgrade to get unlimited documents
            </Link>
          </div>
        )}

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          currentCount={limitData?.currentCount || 0}
          limit={limitData?.limit || 3}
          cycleEnd={limitData?.cycleEnd}
          isLoading={!isInitialized}
        />
      </div>
    </>
  );
}
