import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface PaymentStatusModalProps {
  status: "success" | "failed" | null;
  onClose: () => void;
}

export function PaymentStatusModal({ status, onClose }: PaymentStatusModalProps) {
  const router = useRouter();

  if (!status) return null;

  const content = {
    success: {
      title: "Payment Successful!",
      icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
      message: "Thank you for your subscription. Your account has been upgraded.",
      buttonText: "Continue to Dashboard",
      buttonAction: () => {
        onClose();
        router.refresh();
      },
    },
    failed: {
      title: "Payment Failed",
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      message:
        "The payment was not completed. Please try again or contact support.",
      buttonText: "Try Again",
      buttonAction: () => {
        router.push("/pricing");
      },
      secondaryButton: {
        text: "Contact Support",
        action: () => {
          window.open("mailto:support@mydocwiz.com", "_blank");
        },
      },
    },
  };

  const currentContent = content[status];

  return (
    <Dialog open={!!status} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {currentContent.icon}
            <DialogTitle className="text-xl">
              {currentContent.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-center text-muted-foreground">
            {currentContent.message}
          </p>
          <div className="flex flex-col w-full gap-2">
            <Button
              className="w-full"
              onClick={currentContent.buttonAction}
              variant={status === "success" ? "default" : "destructive"}
            >
              {currentContent.buttonText}
            </Button>
            {status === "failed" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={content.failed.secondaryButton.action}
              >
                {content.failed.secondaryButton.text}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 