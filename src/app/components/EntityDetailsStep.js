import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Country, State, City } from "country-state-city";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const registrationTypes = [
  "LLC",
  "Sole Proprietor",
  "Corporation",
  "Partnership",
  "Other",
];

export default function EntityDetailsStep({ onNext, registrationId }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [entityName, setEntityName] = useState("");
  const [registrationType, setRegistrationType] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [authorizedSignatory, setAuthorizedSignatory] = useState("me");
  const [signatoryEmail, setSignatoryEmail] = useState("");

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  useEffect(() => {
    if (country) {
      setStates(State.getStatesOfCountry(country.isoCode));
      setState("");
      setCity("");
    }
  }, [country]);

  useEffect(() => {
    if (state) {
      setCities(City.getCitiesOfState(country.isoCode, state.isoCode));
      setCity("");
    }
  }, [state, country]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          entity_name: entityName,
          registration_type: registrationType,
          country_code: country.isoCode,
          country_name: country.name,
          state_code: state?.isoCode || null,
          state_name: state?.name || null,
          city_name: city?.name || null,
          authorized_signatory: authorizedSignatory,
          signatory_email:
            authorizedSignatory === "someone_else" ? signatoryEmail : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;

      // Check email verification status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email_confirmed_at) {
        // If email is not verified, redirect to verify email page
        router.push("/verify-email");
      } else {
        // If email is verified, proceed to dashboard
        router.push("/dashboard");
      }

      onNext({
        entityName,
        registrationType,
        jurisdiction: {
          country: country.name,
          state: state?.name || "",
          city: city?.name || "",
        },
        authorizedSignatory,
        signatoryEmail,
      });

    } catch (error) {
      console.error("Error updating registration:", error);
      toast.error("Failed to update registration details");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="entityName">Entity Name</Label>
        <Input
          id="entityName"
          placeholder="Enter entity name"
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="registrationType">Registration Type</Label>
        <Select onValueChange={setRegistrationType} required>
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
          onValueChange={(value) =>
            setCountry(countries.find((c) => c.isoCode === value))
          }
          required
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

      {country && states.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="state">State/Province</Label>
          <Select
            onValueChange={(value) =>
              setState(states.find((s) => s.isoCode === value))
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

      {state && cities.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Select
            onValueChange={(value) =>
              setCity(cities.find((c) => c.name === value))
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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Selecting the correct jurisdiction is crucial for ensuring the
          validity of your documents and compliance with local regulations.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Authorized Signatory</Label>
        <RadioGroup
          value={authorizedSignatory}
          onValueChange={setAuthorizedSignatory}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="me" id="me" />
            <Label htmlFor="me">Me</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="someone_else" id="someone_else" />
            <Label htmlFor="someone_else">Someone Else</Label>
          </div>
        </RadioGroup>
      </div>
      {authorizedSignatory === "someone_else" && (
        <div className="space-y-2">
          <Label htmlFor="signatoryEmail">Signatory Email</Label>
          <Input
            id="signatoryEmail"
            type="email"
            placeholder="Enter signatory email"
            value={signatoryEmail}
            onChange={(e) => setSignatoryEmail(e.target.value)}
            required
          />
        </div>
      )}
      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  );
}
