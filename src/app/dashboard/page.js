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
import { UserCircle } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    signedDocuments: 0,
    totalParties: 0,
  });
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [userDocuments, setUserDocuments] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [uniqueParties, setUniqueParties] = useState([]);
  const [showPartiesDialog, setShowPartiesDialog] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showSignedDocsDialog, setShowSignedDocsDialog] = useState(false);
  const [signedDocsSearchQuery, setSignedDocsSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch registrations
        const { data: registrationsData, error: registrationsError } =
          await supabase
            .from("registrations")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (registrationsError) throw registrationsError;
        setRegistrations(registrationsData || []);

        // Fetch user documents
        const { data: documentsData, error: documentsError } = await supabase
          .from("user_documents")
          .select(
            `
            *,
            template:templates(template_name)
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (documentsError) throw documentsError;
        setUserDocuments(documentsData || []);

        // Process documents to extract unique parties and count documents
        const parties = new Map();
        let totalDocs = documentsData.length;
        let signedDocs = 0;

        documentsData.forEach((doc) => {
          // Count signed/completed documents
          if (doc.status === "completed" || doc.status === "signed") {
            signedDocs++;
          }

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

        setUniqueParties(Array.from(parties.values()));
        setStats({
          totalDocuments: totalDocs,
          signedDocuments: signedDocs,
          totalParties: parties.size,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
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

  const filteredDocuments = userDocuments.filter((doc) => {
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
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
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  // Check subscription status directly from database
                  const { data: subscription } = await supabase
                    .from("subscriptions")
                    .select("status, stripe_subscription_id")
                    .eq("registration_id", registrations[0]?.id) // Assuming the first registration
                    .single();

                  if (
                    subscription?.status === "active" &&
                    subscription?.stripe_subscription_id
                  ) {
                    // If subscribed, open customer portal
                    const response = await fetch("/api/create-billing-portal", {
                      method: "POST",
                    });
                    const { session_url, error } = await response.json();
                    if (error) throw new Error(error);
                    window.location.href = session_url;
                  } else {
                    // If not subscribed, open pricing page
                    router.push("/pricing");
                  }
                } catch (error) {
                  console.error("Error handling billing:", error);
                  // If any error occurs, redirect to pricing page
                  router.push("/pricing");
                }
              }}
            >
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/sign-in");
              }}
              className="text-red-600"
            >
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
            <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
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
        <Dialog>
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
                Select a Template
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
                Loading templates...
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Template Name</TableHead>
                      <TableHead className="w-[150px]">Ideal For</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          {template.template_name}
                        </TableCell>
                        <TableCell>{template.ideal_for}</TableCell>
                        <TableCell>
                          <div className="max-h-[100px] overflow-y-auto pr-4">
                            {template.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                // Get current user
                                const {
                                  data: { user },
                                } = await supabase.auth.getUser();
                                if (!user) throw new Error("Not authenticated");

                                // Create new user document from template
                                const { data: newDocument, error } =
                                  await supabase
                                    .from("user_documents")
                                    .insert([
                                      {
                                        user_id: user.id,
                                        template_id: template.id,
                                        content: template.content,
                                        title: template.template_name,
                                        status: "draft",
                                      },
                                    ])
                                    .select()
                                    .single();

                                if (error) throw error;

                                // Redirect to editor with new document ID
                                router.push(
                                  `/editor/document/${newDocument.id}`
                                );
                              } catch (error) {
                                console.error(
                                  "Error creating document:",
                                  error
                                );
                                // Add error handling/notification here
                              }
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                      onClick={() => router.push(`/editor/document/${doc.id}`)}
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
    </div>
  );
}
