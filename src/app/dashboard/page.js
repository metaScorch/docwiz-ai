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

        // Calculate stats
        setStats({
          totalDocuments: (documentsData || []).length,
          signedDocuments: (documentsData || []).filter(
            (doc) => doc.status === "completed"
          ).length,
          totalParties: registrationsData.reduce(
            (acc, doc) => acc + (doc.parties?.length || 0),
            0
          ),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  const filteredDocuments = userDocuments.filter((doc) =>
    Object.values({
      title: doc.title || "",
      description: doc.description || "",
    }).some((value) =>
      value.toLowerCase().includes(documentSearchQuery.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Logo Section */}
      <div className="flex justify-start mb-8">
        <Image
          src="/logo.png"
          alt="DocWiz Logo"
          width={180}
          height={60}
          priority
          className="h-auto"
        />
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Signed Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signedDocuments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParties}</div>
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
          <div className="mt-4">
            <br></br>
            <Input
              type="text"
              placeholder="Search documents..."
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              className="max-w-sm"
            />
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
                          ? "bg-yellow-100 text-yellow-800"
                          : doc.status === "signed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {doc.status || "draft"}
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
                      Edit
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
    </div>
  );
}
