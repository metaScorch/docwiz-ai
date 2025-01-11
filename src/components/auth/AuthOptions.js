import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Mail } from "lucide-react";
import useAuthStore from "@/stores/authStore";

export default function AuthOptions({ onMagicLinkClick }) {
  const { signUpWithGoogle, isLoading } = useAuthStore();

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signUpWithGoogle}
        disabled={isLoading}
      >
        <FcGoogle className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>

      {onMagicLinkClick && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onMagicLinkClick}
          disabled={isLoading}
        >
          <Mail className="mr-2 h-4 w-4" />
          Continue with Magic Link
        </Button>
      )}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or</span>
        </div>
      </div>
    </div>
  );
}
