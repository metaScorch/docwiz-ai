"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Check,
  ChevronsUpDown,
  UserCircle,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { JurisdictionSearch } from "@/components/JurisdictionSearch.jsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { industries } from "@/data/industries";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePostHog } from "posthog-js/react";
import { useDropzone } from "react-dropzone";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    entity_name: "",
    industry: "",
    jurisdiction: "",
    authorized_signatory: "",
    signatory_email: "",
    registration_type: "",
    domain: "",
    description: "",
  });
  const [userEmail, setUserEmail] = useState("");
  const [signatoryType, setSignatoryType] = useState("myself");
  const [logoUrl, setLogoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ unit: "%", width: 100, aspect: 3 / 1 });
  const posthog = usePostHog();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          router.push("/sign-in");
          return;
        }

        setUserEmail(user.email);

        const { data: registration, error } = await supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (!mounted) return;

        setProfile(registration);
        setLogoUrl(registration.logo_url);
        setFormData({
          entity_name: registration.entity_name || "",
          industry: registration.industry || "",
          jurisdiction: registration.jurisdiction || "",
          authorized_signatory: registration.authorized_signatory || "",
          signatory_email: registration.signatory_email || "",
          registration_type: registration.registration_type || "",
          domain: registration.domain || "",
          description: registration.description || "",
        });

        setSignatoryType(
          registration.authorized_signatory === "me" ? "myself" : "someone_else"
        );
      } catch (error) {
        if (mounted) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile. Please try again.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleSave = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.signatory_email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("registrations")
        .update(formData)
        .eq("user_id", user.id);

      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setEditing(false);
      toast.success("Profile updated successfully.");

      if (posthog) {
        posthog.capture("profile_updated", {
          updated_fields: Object.keys(formData).filter(
            (key) => formData[key] !== profile[key]
          ),
          has_entity_name: !!formData.entity_name,
          industry: formData.industry,
          jurisdiction: formData.jurisdiction,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const handleJurisdictionChange = (value) => {
    setFormData({ ...formData, jurisdiction: value });
  };

  const handleIndustrySelect = (value) => {
    if (industries.includes(value)) {
      setFormData({ ...formData, industry: value });
    } else {
      setFormData({ ...formData, industry: value.toLowerCase() });
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImage(reader.result);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleCropComplete = async (croppedImage) => {
    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Convert base64 to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();

      // Create a unique file path including user ID for better organization
      const fileExt = "png";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
        error: urlError,
      } = supabase.storage.from("logos").getPublicUrl(fileName);

      if (urlError) {
        throw urlError;
      }

      // Update registration with new logo URL
      const { error: updateError } = await supabase
        .from("registrations")
        .update({ logo_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      setLogoUrl(publicUrl);
      setShowCropDialog(false);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error.message || error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async (e) => {
    e.stopPropagation();
    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Extract file name from URL
      const fileUrl = new URL(logoUrl);
      const filePath = fileUrl.pathname.split("/").slice(-2).join("/");

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("logos")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update registration to remove logo_url
      const { error: updateError } = await supabase
        .from("registrations")
        .update({ logo_url: null })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setLogoUrl(null);
      toast.success("Logo deleted successfully");
    } catch (error) {
      console.error("Error deleting logo:", error.message || error);
      toast.error("Failed to delete logo");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
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
                  const { data: subscription } = await supabase
                    .from("subscriptions")
                    .select("status, stripe_subscription_id")
                    .eq("registration_id", profile?.id)
                    .single();

                  if (
                    subscription?.status === "active" &&
                    subscription?.stripe_subscription_id
                  ) {
                    const response = await fetch("/api/create-billing-portal", {
                      method: "POST",
                    });
                    const { session_url, error } = await response.json();
                    if (error) throw new Error(error);
                    window.location.href = session_url;
                  } else {
                    router.push("/pricing");
                  }
                } catch (error) {
                  console.error("Error handling billing:", error);
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

      <Button
        variant="ghost"
        className="mb-6 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl font-semibold text-primary">
            Profile Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="mb-6">
            <Label className="text-sm font-medium">Company Logo</Label>
            <div
              {...getRootProps()}
              className={cn(
                "mt-2 border-2 border-dashed rounded-lg p-4 max-w-[300px] relative",
                isDragActive && "border-primary bg-primary/5"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-start gap-2">
                {logoUrl ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full"
                      onClick={handleDeleteLogo}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "×"
                      )}
                    </Button>
                    <div className="w-[100px]">
                      <Image
                        src={logoUrl}
                        alt="Company Logo"
                        width={100}
                        height={33}
                        className="rounded-lg"
                        priority={true}
                        unoptimized={false}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop your logo here or click to select
                    </p>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              You can use this logo in your document headers
            </p>
          </div>

          <div className="grid gap-6">
            {Object.entries(formData).map(([key, value]) => {
              if (key === "authorized_signatory") {
                return (
                  <div key={key} className="space-y-4">
                    <Label
                      htmlFor={key}
                      className="text-sm font-medium capitalize"
                    >
                      Authorized Signatory
                    </Label>
                    {editing ? (
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="myself"
                              name="signatoryType"
                              value="myself"
                              checked={signatoryType === "myself"}
                              onChange={(e) => {
                                setSignatoryType("myself");
                                setFormData({
                                  ...formData,
                                  authorized_signatory: "me",
                                  signatory_email: userEmail,
                                });
                              }}
                              className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="myself" className="text-sm">
                              Myself
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="someone_else"
                              name="signatoryType"
                              value="someone_else"
                              checked={signatoryType === "someone_else"}
                              onChange={(e) => {
                                setSignatoryType("someone_else");
                                setFormData({
                                  ...formData,
                                  authorized_signatory: "",
                                  signatory_email: "",
                                });
                              }}
                              className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="someone_else" className="text-sm">
                              Someone else
                            </Label>
                          </div>
                        </div>

                        {signatoryType === "someone_else" && (
                          <div className="space-y-4 pl-6">
                            <div className="space-y-2">
                              <Label
                                htmlFor="signatory_name"
                                className="text-sm"
                              >
                                Signatory Name
                              </Label>
                              <Input
                                id="signatory_name"
                                value={
                                  formData.authorized_signatory === "me"
                                    ? ""
                                    : formData.authorized_signatory
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    authorized_signatory: e.target.value,
                                  })
                                }
                                placeholder="Enter signatory name"
                                className="max-w-md"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="signatory_email"
                                className="text-sm"
                              >
                                Signatory Email
                              </Label>
                              <Input
                                id="signatory_email"
                                type="email"
                                value={formData.signatory_email}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    signatory_email: e.target.value,
                                  })
                                }
                                placeholder="Enter signatory email"
                                className="max-w-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {value === "me" ? (
                          <span>Myself ({userEmail})</span>
                        ) : (
                          <span>
                            {value} ({formData.signatory_email})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (key === "signatory_email") {
                return null;
              }

              return (
                <div key={key} className="space-y-2">
                  <Label
                    htmlFor={key}
                    className="text-sm font-medium capitalize"
                  >
                    {key === "registration_type"
                      ? "Organization Type"
                      : key.replace("_", " ")}
                  </Label>
                  {editing ? (
                    key === "jurisdiction" ? (
                      <JurisdictionSearch
                        value={value}
                        onChange={handleJurisdictionChange}
                        defaultValue={value || undefined}
                      />
                    ) : key === "industry" ? (
                      <div className="flex flex-col gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between max-w-md"
                            >
                              {formData.industry ||
                                "Select or enter industry..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Type or select industry..."
                                value={formData.industry}
                                onValueChange={(value) =>
                                  setFormData({ ...formData, industry: value })
                                }
                              />
                              <CommandEmpty>
                                Press enter to use this industry
                              </CommandEmpty>
                              <CommandGroup>
                                {industries.map((industry) => (
                                  <CommandItem
                                    key={industry}
                                    value={industry}
                                    onSelect={handleIndustrySelect}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.industry === industry
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {industry}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : key === "description" ? (
                      <textarea
                        id={key}
                        value={value}
                        onChange={(e) =>
                          setFormData({ ...formData, [key]: e.target.value })
                        }
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-md"
                      />
                    ) : (
                      <Input
                        id={key}
                        value={value}
                        onChange={(e) =>
                          setFormData({ ...formData, [key]: e.target.value })
                        }
                        className="max-w-md"
                      />
                    )
                  ) : (
                    <div className="text-muted-foreground">
                      {value || "Not set"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end space-x-4">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop Logo</DialogTitle>
          </DialogHeader>
          {cropImage && (
            <div className="space-y-4">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                aspect={3 / 1}
                className="max-w-full"
              >
                <img src={cropImage} alt="Crop" style={{ maxWidth: "100%" }} />
              </ReactCrop>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCropDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCropComplete(cropImage)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
