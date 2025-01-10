"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Country, State, City } from "country-state-city";

const registrationTypes = [
  "LLC",
  "Sole Proprietorship",
  "Corporation",
  "Partnership",
  "Other",
];

export default function EntityDetailsStep({ onNext, registrationId }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    entityName: "",
    registrationType: "",
    country: null,
    state: null,
    city: null,
    authorizedSignatory: "me",
    signatoryEmail: "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Load countries on mount
  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (formData.country) {
      setStates(State.getStatesOfCountry(formData.country.isoCode));
      setFormData((prev) => ({ ...prev, state: null, city: null }));
    }
  }, [formData.country]);

  // Load cities when state changes
  useEffect(() => {
    if (formData.country && formData.state) {
      setCities(
        City.getCitiesOfState(formData.country.isoCode, formData.state.isoCode)
      );
      setFormData((prev) => ({ ...prev, city: null }));
    }
  }, [formData.state, formData.country]);

  // Load existing data if available
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const { data: registration, error } = await supabase
          .from("registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (error) throw error;

        if (registration) {
          const country = registration.country_code
            ? Country.getCountryByCode(registration.country_code)
            : null;

          const state =
            country && registration.state_code
              ? State.getStateByCodeAndCountry(
                  registration.state_code,
                  country.isoCode
                )
              : null;

          setFormData({
            entityName: registration.entity_name || "",
            registrationType: registration.registration_type || "",
            country: country,
            state: state,
            city: registration.city_name
              ? { name: registration.city_name }
              : null,
            authorizedSignatory: registration.authorized_signatory || "me",
            signatoryEmail: registration.signatory_email || "",
          });
        }
      } catch (error) {
        console.error("Error fetching entity details:", error);
        toast.error("Failed to load existing entity details");
      }
    };

    if (registrationId) {
      fetchExistingData();
    }
  }, [registrationId, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          entity_name: formData.entityName,
          registration_type: formData.registrationType,
          country_code: formData.country?.isoCode,
          country_name: formData.country?.name,
          state_code: formData.state?.isoCode,
          state_name: formData.state?.name,
          city_name: formData.city?.name,
          authorized_signatory: formData.authorizedSignatory,
          signatory_email:
            formData.authorizedSignatory === "someone_else"
              ? formData.signatoryEmail
              : null,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;

      // Check email verification status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email_confirmed_at) {
        // If email is not verified, redirect to verify email page
        router.push("/verify-email");
      } else {
        // If email is verified, proceed to dashboard
        router.push("/dashboard");
      }

      onNext(formData);
    } catch (error) {
      console.error("Error updating entity details:", error);
      toast.error("Failed to save entity details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Entity Details</h1>
        <p className="text-muted-foreground mt-2">
          Tell us about your business entity
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entityName">Entity Name</Label>
          <Input
            id="entityName"
            placeholder="Legal name of your business"
            value={formData.entityName}
            onChange={(e) =>
              setFormData({ ...formData, entityName: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationType">Registration Type</Label>
          <Select
            value={formData.registrationType}
            onValueChange={(value) =>
              setFormData({ ...formData, registrationType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select registration type" />
            </SelectTrigger>
            <SelectContent>
              {registrationTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select
            value={formData.country?.isoCode}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                country: countries.find((c) => c.isoCode === value),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {states.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Select
              value={formData.state?.isoCode}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  state: states.find((s) => s.isoCode === value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state/province" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {cities.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select
              value={formData.city?.name}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  city: cities.find((c) => c.name === value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Authorized Signatory</Label>
          <RadioGroup
            value={formData.authorizedSignatory}
            onValueChange={(value) =>
              setFormData({ ...formData, authorizedSignatory: value })
            }
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="me" id="me" />
              <Label htmlFor="me">I am the authorized signatory</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="someone_else" id="someone_else" />
              <Label htmlFor="someone_else">Someone else will sign</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.authorizedSignatory === "someone_else" && (
          <div className="space-y-2">
            <Label htmlFor="signatoryEmail">Signatory Email</Label>
            <Input
              id="signatoryEmail"
              type="email"
              placeholder="authorized.signer@company.com"
              value={formData.signatoryEmail}
              onChange={(e) =>
                setFormData({ ...formData, signatoryEmail: e.target.value })
              }
              required
            />
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/verify-email")}
          >
            Skip
          </Button>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Complete Registration
          </Button>
        </div>
      </form>
    </div>
  );
}
