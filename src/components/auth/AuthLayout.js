import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function AuthLayout({
  children,
  loading = false,
  showLogo = true,
  headerContent,
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Verifying your authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            {showLogo && (
              <Link href="/" className="self-center">
                <Image
                  src="/logo.png"
                  alt="DocWiz Logo"
                  width={120}
                  height={40}
                  priority
                  className="h-auto"
                />
              </Link>
            )}
            {headerContent}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
