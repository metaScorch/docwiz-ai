import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Briefcase, Users, User } from "lucide-react";
import { useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";


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

  console.log('OrganizationTypeStep registrationId:', registrationId); // Debug log

  const handleSelection = useCallback(
    async (type) => {
      try {
        console.log('Updating registration:', registrationId, type); // Debug log
        
        if (!registrationId) {
          throw new Error('Registration ID is missing');
        }

        const { error } = await supabase
          .from("registrations")
          .update({ organization_type: type })
          .eq("id", registrationId);

        if (error) throw error;
        onNext({ organizationType: type });
      } catch (error) {
        console.error("Failed to update organization type:", error);
        // You might want to add error handling UI here
      }
    },
    [registrationId, onNext, supabase]
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {organizationTypes.map(({ type, icon: Icon, description }) => (
        <Card
          key={type}
          className="cursor-pointer hover:bg-gray-100"
          onClick={() => handleSelection(type)}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Icon className="w-12 h-12 mb-2" />
            <span className="font-medium">{type}</span>
            <p className="text-sm text-gray-500 text-center mt-1">
              {description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
