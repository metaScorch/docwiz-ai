"use client";

import { useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Briefcase, Users, User } from "lucide-react";
import { toast } from "sonner";

const organizationTypes = [
  {
    type: "Individual",
    icon: User,
    description: "Perfect for freelancers and solo entrepreneurs",
  },
  {
    type: "SMB",
    icon: Briefcase,
    description: "Ideal for small and medium-sized businesses",
  },
  {
    type: "Startup",
    icon: Users,
    description: "Built for fast-growing companies and teams",
  },
  {
    type: "Enterprise",
    icon: Building,
    description: "Designed for large organizations with complex needs",
  },
];

export default function OrganizationTypeStep({ onNext, registrationId }) {
  const supabase = createClientComponentClient();

  console.log("Organization Type Step - Registration ID:", registrationId);

  const handleSelection = useCallback(
    async (type) => {
      try {
        if (!registrationId) {
          console.error("Registration ID is missing:", registrationId);
          throw new Error("Registration ID is missing");
        }

        const { error } = await supabase
          .from("registrations")
          .update({
            organization_type: type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", registrationId);

        if (error) throw error;
        onNext({ organizationType: type });
      } catch (error) {
        console.error("Failed to update organization type:", error);
        toast.error("Failed to save organization type");
      }
    },
    [registrationId, onNext, supabase]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Select your organization type</h1>
        <p className="text-muted-foreground mt-2">
          Choose the option that best describes your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {organizationTypes.map(({ type, icon: Icon, description }) => (
          <Card
            key={type}
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleSelection(type)}
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Icon className="w-12 h-12 mb-4 text-primary" />
              <h3 className="font-medium text-lg mb-2">{type}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        You can always change this later in your settings
      </p>
    </div>
  );
}
