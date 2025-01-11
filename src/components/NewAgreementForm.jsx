import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Wand2, Check, Loader2, AlertCircle } from "lucide-react"; // Import the magic wand icon
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Select } from "@/components/ui/select";
import { JurisdictionSearch } from "@/components/JurisdictionSearch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { UpgradeModal } from "@/components/UpgradeModal";
import { checkDocumentLimit } from "@/utils/usageLimits";
import { toast } from "sonner"; // Add Sonner import
import { Toaster } from "sonner"; // Add Toaster import
import { posthog } from '@/lib/posthog';

export function NewAgreementForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("");
  const [userRegistration, setUserRegistration] = useState(null);
  const [complexity, setComplexity] = useState(3);
  const [length, setLength] = useState(3);
  const [jurisdictionError, setJurisdictionError] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [legalityError, setLegalityError] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitData, setLimitData] = useState(null);

  const generationSteps = [
    "Understanding the requirement",
    "Retrieving the context",
    "Looking up relevant laws",
    "Checking jurisdiction specific laws",
    "Writing your agreement based on research",
    "Finalizing your agreement"
  ];

  useEffect(() => {
    // Fetch user registration and limit data in parallel
    const initializeForm = async () => {
      const [registrationResult, limitResult] = await Promise.allSettled([
        fetchUserRegistration(),
        checkUserLimits()
      ]);

      // Handle registration result
      if (registrationResult.status === 'fulfilled' && registrationResult.value) {
        setUserRegistration(registrationResult.value);
        setJurisdiction(
          registrationResult.value.jurisdiction || 
          `${registrationResult.value.city_name}, ${registrationResult.value.state_name}, ${registrationResult.value.country_name}`
        );
      }

      // Handle limit result
      if (limitResult.status === 'fulfilled' && limitResult.value) {
        setLimitData(limitResult.value);
      }
    };

    initializeForm();
  }, []);

  // Separate functions for cleaner code
  const fetchUserRegistration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('registrations')
          .select('city_name, state_name, country_name, jurisdiction')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error fetching user registration:', error);
      return null;
    }
  };

  const checkUserLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return await checkDocumentLimit(user.id);
      }
    } catch (error) {
      console.error('Error checking document limit:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const startTime = Date.now();
    
    if (!jurisdiction) {
      setJurisdictionError(true);
      // Track validation error
      posthog.capture('agreement_generation_validation_error', {
        error_type: 'missing_jurisdiction'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Track generation attempt
      posthog.capture('agreement_generation_started', {
        jurisdiction,
        complexity,
        length,
        prompt_length: prompt.length,
        has_subscription: false // Will be updated below
      });

      setLoading(true);
      setGenerationStep(0);

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
        const limitInfo = await checkDocumentLimit(user.id);
        setLimitData(limitInfo);
        
        if (!limitInfo.allowed) {
          setLoading(false);
          setShowUpgrade(true);
          // Track limit reached
          posthog.capture('agreement_generation_limit_reached', {
            current_count: limitInfo.currentCount,
            limit: limitInfo.limit,
            cycle_end: limitInfo.cycleEnd
          });
          return;
        }

        posthog.capture('agreement_generation_limit_check', {
          current_count: limitInfo.currentCount,
          limit: limitInfo.limit,
          remaining: limitInfo.limit - limitInfo.currentCount
        });
      }

      setJurisdictionError(false);
      
      // Start the loading states animation
      const loadingStatesPromise = (async () => {
        for (let i = 0; i < generationSteps.length - 1; i++) {
          const delay = i === 4 ? 4000 : 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          setGenerationStep(i + 1);
        }
      })();

      // Make the API call in parallel
      const response = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userId: user.id,
          jurisdiction,
          complexity,
          length
        }),
      });

      const data = await response.json();
      
      if (response.status === 429) {
        setRateLimitError({
          message: "Error generating agreement",
          details: "Rate limit exceeded",
          resetIn: data.resetIn
        });
        // Track rate limit error
        posthog.capture('agreement_generation_rate_limit', {
          reset_in: data.resetIn
        });
        return;
      }
      
      if (response.status === 422) {
        setLegalityError({
          message: "This agreement cannot be generated",
          details: data.legalityNotes
        });
        // Track legality error
        posthog.capture('agreement_generation_legality_error', {
          jurisdiction,
          error_details: data.legalityNotes
        });
        return;
      }

      if (!response.ok) throw new Error(data.error);

      await loadingStatesPromise;
      
      // Track successful generation
      posthog.capture('agreement_generation_completed', {
        document_id: data.id,
        generation_time: Date.now() - startTime,
        complexity,
        length,
        jurisdiction
      });

      router.push(`/editor/document/${data.id}`);

    } catch (error) {
      console.error('Error:', error);
      // Track generation error
      posthog.capture('agreement_generation_error', {
        error_message: error.message,
        error_type: error.name
      });
      toast.error("Failed to generate agreement", {
        description: error.message
      });
    } finally {
      setLoading(false);
      setGenerationStep(0);
    }
  };

  const getComplexityLabel = (value) => {
    const labels = {
      1: "Simple, easy to understand",
      2: "Basic legal terms",
      3: "Standard legal language",
      4: "Detailed legal terminology",
      5: "Complex legal language"
    };
    return labels[value];
  };

  const getLengthLabel = (value) => {
    const labels = {
      1: "Very brief",
      2: "Concise",
      3: "Standard",
      4: "Detailed",
      5: "Comprehensive"
    };
    return labels[value];
  };

  const LoadingStates = () => (
    <div className="space-y-2 mt-4">
      {generationSteps.map((step, index) => {
        const isComplete = index < generationStep;
        const isCurrent = index === generationStep;
        
        return (
          <div key={step} className="flex items-center gap-2 text-sm">
            {isComplete ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : isCurrent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span className={isComplete ? "text-green-500" : "text-muted-foreground"}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );

  const formatTimeRemaining = (seconds) => {
    // Input is already in seconds, no need to convert from timestamp
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
  };

  // Track form field changes
  const handleComplexityChange = (value) => {
    setComplexity(value);
    posthog.capture('agreement_complexity_changed', {
      complexity: value,
      complexity_label: getComplexityLabel(value)
    });
  };

  const handleLengthChange = (value) => {
    setLength(value);
    posthog.capture('agreement_length_changed', {
      length: value,
      length_label: getLengthLabel(value)
    });
  };

  const handleJurisdictionChange = (value) => {
    setJurisdiction(value);
    posthog.capture('agreement_jurisdiction_changed', {
      jurisdiction: value,
      is_default: value === `${userRegistration?.city_name}, ${userRegistration?.state_name}, ${userRegistration?.country_name}`
    });
  };

  return (
    <>
      <Toaster />
      <form onSubmit={handleSubmit} className="space-y-4">
        {legalityError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{legalityError.message}</AlertTitle>
            <AlertDescription>
              {legalityError.details}
            </AlertDescription>
          </Alert>
        )}
        {rateLimitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error generating agreement</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Ouch, You've hit usage limits, Contact support for higher limits</p>
             
              <b>
                Please try again in {formatTimeRemaining(rateLimitError.resetIn)}
              </b>
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">AI-Powered Generation</span>
          </div>
          <Textarea
            placeholder="Explain what agreement you need and for what purpose...
Example: I need a non-disclosure agreement for a freelance developer who will be working on my startup"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Tip: Check our templates first to save time - we have many common agreements ready to use.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Jurisdiction <span className="text-red-500">*</span>
          </label>
          <JurisdictionSearch
            value={jurisdiction}
            onChange={handleJurisdictionChange}
            defaultValue={userRegistration ? 
              (userRegistration.jurisdiction || 
              `${userRegistration.city_name}, ${userRegistration.state_name}, ${userRegistration.country_name}`) : 
              "Select jurisdiction"
            }
          />
          {jurisdictionError && (
            <p className="text-sm text-red-500">
              Please select a jurisdiction
            </p>
          )}
          {userRegistration && (
            <p className="text-sm text-muted-foreground">
              Default jurisdiction based on your registration
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Wording Complexity</label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[complexity]}
              onValueChange={([value]) => handleComplexityChange(value)}
              className="w-full"
              style={{
                "--slider-color": "#0700c7"
              }}
            />
            <p className="text-sm text-muted-foreground">{getComplexityLabel(complexity)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Agreement Length</label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[length]}
              onValueChange={([value]) => handleLengthChange(value)}
              className="w-full"
              style={{
                "--slider-color": "#0700c7"
              }}
            />
            <p className="text-sm text-muted-foreground">{getLengthLabel(length)}</p>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Agreement"}
        </Button>

        {loading && <LoadingStates />}
      </form>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentCount={limitData?.currentCount || 0}
        limit={limitData?.limit || 3}
        cycleEnd={limitData?.cycleEnd}
        isLoading={false}
      />
    </>
  );
}