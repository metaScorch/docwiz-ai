"use client";
export const dynamic = "force-dynamic";

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
import { Wand2, UserCircle, CreditCard, LogOut, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpgradeModal } from "@/components/UpgradeModal";
import { checkDocumentLimit } from "@/utils/usageLimits";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { posthog } from "@/lib/posthog";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentStatusModal } from "@/components/PaymentStatusModal";

// Status filter definitions
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_signature", label: "Pending Signature" },
  { value: "completed", label: "Completed" },
];

// Dialog for showing parties
const PartiesDialog = ({
  open,
  onOpenChange,
  parties,
  searchQuery,
  onSearchChange,
  formatRelativeTime,
  router,
}) => {
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1000px] max-h-[80vh]">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-2xl font-semibold">
              Document Parties
            </DialogTitle>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-md"
            />
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            {parties.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No parties found matching your search.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead className="w-[300px]">Email</TableHead>
                    <TableHead className="w-[120px] text-center">
                      Total Documents
                    </TableHead>
                    <TableHead>Documents Status</TableHead>
                    <TableHead className="text-right w-[150px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties.map((party) => (
                    <TableRow key={party.email} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {party.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {party.email}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {party.documents.length}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span className="text-sm">
                              {
                                party.documents.filter(
                                  (doc) => doc.status === "draft"
                                ).length
                              }{" "}
                              Draft
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-sm">
                              {
                                party.documents.filter(
                                  (doc) => doc.status === "pending_signature"
                                ).length
                              }{" "}
                              Pending
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm">
                              {
                                party.documents.filter(
                                  (doc) =>
                                    doc.status === "completed" ||
                                    doc.status === "signed"
                                ).length
                              }{" "}
                              Completed
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setSelectedParty(party);
                            setShowDocuments(true);
                          }}
                        >
                          View Documents
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

      {/* Documents Dialog */}
      <Dialog open={showDocuments} onOpenChange={setShowDocuments}>
        <DialogContent className="max-w-[1000px] max-h-[80vh]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold">
              Documents for {selectedParty?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedParty?.email}
            </p>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            {selectedParty && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[300px]">Document Title</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedParty.documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
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
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(doc.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-primary hover:text-primary-foreground"
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
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Dialog for showing signed documents
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

// Component that uses search params
function SearchParamsHandler() {
  const searchParams = useSearchParams();
  // Handle any search params logic here
  return null;
}

// Add this helper function before the return statement
const formatIdealFor = (idealFor) => {
  if (!idealFor) return "";

  if (typeof idealFor === "string") {
    try {
      return JSON.parse(idealFor).join(", ");
    } catch {
      return idealFor;
    }
  }

  return Array.isArray(idealFor) ? idealFor.join(", ") : idealFor;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();

  // Basic stats
  const [stats, setStats] = useState({
    totalDocuments: 0,
    signedDocuments: 0,
    totalParties: 0,
  });

  // Documents, templates, search/filter states
  const [userDocuments, setUserDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [uniqueParties, setUniqueParties] = useState([]);
  const [showPartiesDialog, setShowPartiesDialog] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showSignedDocsDialog, setShowSignedDocsDialog] = useState(false);
  const [signedDocsSearchQuery, setSignedDocsSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all"); // "all" or "my"

  // Limits, subscription checks, loading states
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inside DashboardPage component, add this state:
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [userLogo, setUserLogo] = useState(null);

  // On mount, fetch user session, registration, subscription, documents
  useEffect(() => {
    async function initDashboard() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Check user registrations
        const { data: registrations, error: regError } = await supabase
          .from("registrations")
          .select("id, status, created_at, logo_url")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (regError) {
          console.error("Registration error:", regError);
          return;
        }

        // If none, redirect to complete-signup
        if (!registrations || registrations.length === 0) {
          router.push("/complete-signup");
          return;
        }

        const latestRegistration = registrations[0];
        // Set the logo URL if it exists
        if (latestRegistration.logo_url) {
          setUserLogo(latestRegistration.logo_url);
        }

        // Check subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("registration_id", latestRegistration.id)
          .maybeSingle();

        const hasActiveSubscription = subscription?.status === "active";

        // If no active subscription, check usage limits
        if (!hasActiveSubscription) {
          try {
            const usage = await checkDocumentLimit(session.user.id);
            setLimitData(usage);
            if (!usage.allowed) {
              setShowUpgrade(true);
            }
          } catch (limitError) {
            console.error("Error checking usage limit:", limitError);
          }
        }

        // Fetch documents from supabase
        const { data: documents, error: docError } = await supabase
          .from("user_documents")
          .select("*, template:template_id(*)")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });

        if (docError) {
          console.error("Error fetching documents:", docError);
          return;
        }

        if (documents) {
          setUserDocuments(documents);
          setFilteredDocuments(documents);

          // Calculate stats
          const totalDocs = documents.length;
          const signedDocs = documents.filter(
            (doc) => doc.status === "completed" || doc.status === "signed"
          ).length;

          // Create organized party data structure
          const partiesMap = new Map();
          documents.forEach((doc) => {
            const signers = doc.document?.signers || [];
            signers.forEach((signer) => {
              if (!partiesMap.has(signer.email)) {
                partiesMap.set(signer.email, {
                  email: signer.email,
                  name: signer.name,
                  documents: [],
                });
              }
              partiesMap.get(signer.email).documents.push({
                id: doc.id,
                title: doc.title,
                status: doc.status,
                created_at: doc.created_at,
                updated_at: doc.updated_at,
              });
            });
          });

          // Convert Map to array and set state
          setUniqueParties(Array.from(partiesMap.values()));

          setStats({
            totalDocuments: totalDocs,
            signedDocuments: signedDocs,
            totalParties: partiesMap.size,
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Dashboard init error:", error);
      }
    }

    initDashboard();
  }, [router, supabase]);

  // Handle document filtering whenever search query or status changes
  useEffect(() => {
    const filtered = userDocuments.filter((doc) => {
      // Check text search
      const matchesSearch = Object.values({
        title: doc.title || "",
        description: doc.description || "",
      }).some((value) =>
        value.toLowerCase().includes(documentSearchQuery.toLowerCase())
      );
      // Check status
      const matchesStatus =
        selectedStatus === "all" ||
        doc.status === selectedStatus ||
        (selectedStatus === "completed" && doc.status === "signed");

      return matchesSearch && matchesStatus;
    });

    setFilteredDocuments(filtered);

    // Track filter in PostHog
    posthog.capture("documents_filtered", {
      filter_status: selectedStatus,
      search_query: documentSearchQuery,
      results_count: filtered.length,
    });
  }, [userDocuments, documentSearchQuery, selectedStatus]);

  // Format relative times
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
    } catch {
      return "Invalid date";
    }
  }

  // Filter logic for parties (not yet used, but here if needed)
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

  // Filter logic for signed docs
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

  // Fetching templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch both public templates and user's custom templates
      const { data, error } = await supabase
        .from("templates")
        .select("*, placeholder_values")
        .or(`is_public.eq.true,and(user_id.eq.${user.id},is_public.eq.false)`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Filter templates by name, description, etc.
  const filteredTemplates = templates.filter((template) => {
    // First apply the my/all filter
    if (templateFilter === "my" && template.is_public) {
      return false;
    }

    // Then apply the search filter
    return Object.values({
      template_name: template.template_name,
      ideal_for: template.ideal_for,
      description: template.description,
    }).some((value) =>
      value?.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );
  });

  // Handle template selection and limit checks
  const handleTemplateClick = async (template) => {
    setLoadingTemplateId(template.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has a registration
      const { data: registration } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!registration) return;

      // Check subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("registration_id", registration.id)
        .single();

      const hasActiveSubscription = subscription?.status === "active";

      // If no subscription, run usage limit check
      if (!hasActiveSubscription) {
        const limitInfo = await checkDocumentLimit(user.id);
        setLimitData(limitInfo);

        if (!limitInfo.allowed) {
          setShowTemplateDialog(false);
          setShowUpgrade(true);
          // Track limit reached
          posthog.capture("template_generation_limit_reached", {
            current_count: limitInfo.currentCount,
            limit: limitInfo.limit,
            cycle_end: limitInfo.cycleEnd,
          });
          return;
        }
      }

      // Create new doc from template
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

      // Close template dialog and navigate to editor
      setShowTemplateDialog(false);
      router.push(`/editor/document/${newDocument.id}`);

      // PostHog analytics
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

  // Billing logic
  const handleBillingClick = async () => {
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
      const { data: registration, error: regError } = await supabase
        .from("registrations")
        .select("id, stripe_customer_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // If no registration or error
      if (!registration || regError) {
        router.push("/pricing");
        return;
      }

      // Check subscription
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("status, stripe_subscription_id")
        .eq("registration_id", registration.id)
        .maybeSingle();

      // If user has an active subscription with Stripe
      if (
        subscription?.status === "active" &&
        subscription?.stripe_subscription_id
      ) {
        const response = await fetch("/api/create-billing-portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { session_url, error } = await response.json();
        if (error) throw new Error(error);

        window.location.href = session_url;
      } else {
        // Not subscribed, redirect to pricing
        router.push("/pricing");
      }
    } catch (error) {
      console.error("Error handling billing:", error);
      toast.error("Failed to access billing portal");
      router.push("/pricing");
    } finally {
      setIsLoadingBilling(false);
    }
  };

  // Update the handleDeleteTemplate function:
  const handleDeleteTemplate = async (template) => {
    // If no template provided, just close the dialog
    if (!template) {
      setTemplateToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", template.id)
        .eq("user_id", (await supabase.auth.getUser()).data.user.id);

      if (error) throw error;

      setTemplates(templates.filter((t) => t.id !== template.id));
      toast.success("Template deleted successfully");

      posthog.capture("template_deleted", {
        template_id: template.id,
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setTemplateToDelete(null);
    }
  };

  // Add this useEffect to handle payment status from URL
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success" || payment === "failed") {
      setPaymentStatus(payment);

      // Track payment status in PostHog
      posthog.capture("payment_status", {
        status: payment,
        timestamp: new Date().toISOString(),
      });
    }
  }, [searchParams]);

  // Add this function to handle modal close
  const handlePaymentModalClose = () => {
    setPaymentStatus(null);
    // Clean up the URL without refreshing the page
    window.history.replaceState({}, "", "/dashboard");
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
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

      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>

      <div className="container mx-auto p-6 space-y-6">
        {/* Top Nav */}
        <div className="flex justify-between items-center mb-8">
          <Image
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto"
          />
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {userLogo ? (
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-90">
                    <div className="h-[30px] w-[120px] overflow-hidden border border-gray-200 rounded flex items-center justify-center bg-white">
                      <Image
                        src={userLogo}
                        alt="Organization Logo"
                        width={120}
                        height={30}
                        className="max-h-[30px] w-auto"
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      My Account
                    </span>
                  </div>
                ) : (
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    My Account
                  </Button>
                )}
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
                  onClick={handleBillingClick}
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

        {/* New Document / Template Buttons */}
        <div className="flex space-x-4 items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#0700c7] text-white hover:bg-[#0700c7]/90">
                <Wand2 className="mr-1 h-4 w-2" />
                Generate Agreement Using AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
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
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${
                        templateFilter === "all"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setTemplateFilter("all")}
                    >
                      All Templates
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${
                        templateFilter === "my"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setTemplateFilter("my")}
                    >
                      My Templates
                    </Button>
                  </div>
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
                              <div className="flex items-center gap-2">
                                {template.template_name}
                                {!template.is_public && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary whitespace-nowrap">
                                    My Template
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatIdealFor(template.ideal_for)}
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate">
                              {template.description}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
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
                                {!template.is_public && ( // Only show delete button for user's own templates
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setTemplateToDelete(template)
                                    }
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
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
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
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

        {/* Parties Dialog */}
        <PartiesDialog
          open={showPartiesDialog}
          onOpenChange={setShowPartiesDialog}
          parties={filteredParties}
          searchQuery={partySearchQuery}
          onSearchChange={setPartySearchQuery}
          formatRelativeTime={formatRelativeTime}
          router={router}
        />

        {/* Signed Documents Dialog */}
        <SignedDocumentsDialog
          open={showSignedDocsDialog}
          onOpenChange={setShowSignedDocsDialog}
          documents={userDocuments.filter(
            (doc) => doc.status === "signed" || doc.status === "completed"
          )}
          searchQuery={signedDocsSearchQuery}
          onSearchChange={setSignedDocsSearchQuery}
          formatRelativeTime={formatRelativeTime}
        />

        {/* Usage Limit Info */}
        {limitData && limitData.current !== undefined && (
          <div className="text-sm text-muted-foreground mb-2">
            You have used {limitData.current} out of {limitData.limit} documents
            this month.{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              Upgrade to get unlimited documents
            </Link>
          </div>
        )}

        {/* Upgrade Modal for limit */}
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          feature="documents"
          currentCount={limitData?.currentCount || 0}
          limit={limitData?.limit || 3}
          cycleEnd={limitData?.cycleEnd}
          isLoading={!isInitialized}
        />

        {/* AlertDialog component */}
        <AlertDialog
          open={templateToDelete !== null}
          onOpenChange={(open) => !open && setTemplateToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "
                {templateToDelete?.template_name}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDeleteTemplate(templateToDelete)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PaymentStatusModal
          status={paymentStatus}
          onClose={handlePaymentModalClose}
        />
      </div>
    </>
  );
}
