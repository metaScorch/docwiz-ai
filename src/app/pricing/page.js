"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function PricingPage() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  return (
    <>
      <Script 
        src="https://js.stripe.com/v3/pricing-table.js"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Choose a Plan</h1>
        {isScriptLoaded && (
          <stripe-pricing-table
            pricing-table-id="prctbl_1Qbil1JX4APU5Hfw2DpiNnGq"
            publishable-key="pk_test_51Qbfu4JX4APU5HfwA26sCXAq4XJWZNKEHOHdR5N95muM5BecJs3NnHYFqaeV9LzKIVWjGKZDAsYuhnWVRalwXjyw00Ac4Mmna3"
          />
        )}
      </div>
    </>
  );
}
