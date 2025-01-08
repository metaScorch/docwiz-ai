import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function UpgradeModal({ 
  open, 
  onOpenChange, 
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold leading-tight text-center">
            Upgrade to Continue Creating Documents
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                <p className="text-yellow-800 text-sm">
                  You've reached your limit of <span className="font-semibold">{limit} documents</span> this month.
                  {cycleEnd && (
                    <span className="block mt-1 text-xs text-yellow-700">
                      Your limit will reset on {cycleResetDate}
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-lg">Upgrade to Unlimited for:</h4>
                <ul className="space-y-2">
                  {[
                    "Unlimited Documents",
                    "Unlimited AI Amendments and Clause Editor",
                    "Unlimited AutoFormat AI",
                    "Premium Templates"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Starting at <span className="font-semibold">$19.99/month</span>
                </p>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgradeClick}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isRedirecting || isLoading}
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

