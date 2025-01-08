import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  currentCount, 
  limit,
  cycleEnd,
  isLoading
}) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const cycleResetDate = cycleEnd 
    ? new Date(cycleEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const handleUpgradeClick = () => {
    setIsRedirecting(true);
    router.push("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Continue Creating Documents</DialogTitle>
          <DialogDescription className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800">
                    You've reached your limit of {limit} documents this month.
                    {cycleEnd && (
                      <span className="block text-sm">
                        Your limit will reset on {cycleResetDate}
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Upgrade to Unlimited for:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>✨ Unlimited Documents</li>
                    <li>🚀 Unlimited AI Amendments and Clause Editor</li>
                    <li>⭐ Unlimited AutoFormat AI</li>
                    <li>💡 Premium Templates</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Starting at $19.99/month
                  </p>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgradeClick}
            className="bg-primary hover:bg-primary/90"
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Upgrade Now'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
