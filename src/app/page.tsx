"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleCryptoPayment = async () => {
    setIsProcessing(true);
    // Simulate crypto payment processing delay

    // Generate anonymous ID: e.g., A7X9P2
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let anonId = '';
    for (let i = 0; i < 6; i++) {
      anonId += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    if (supabase) {
      // Use Real Supabase
      const { error } = await supabase.from('users').insert([{
        anon_id: anonId,
        has_paid_setup: true,
        is_subscribed: true
      }]);
      if (error) {
        console.error("Error creating user:", error);
      }
    }

    // Store mock user data in localStorage so session persists on client side
    localStorage.setItem("anonUser", JSON.stringify({
      id: anonId,
      hasPaidSetup: true,
      isSubscribed: true
    }));

    setTimeout(() => {
      // Redirect to feed
      router.push("/feed");
    }, 2000);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-12 tracking-tighter uppercase">Platform.</h1>

      <div className="space-y-8 text-left text-sm md:text-base border-t border-b border-black py-8 w-full">
        <p>
          NO ADS.<br/>
          NO PHOTOS.<br/>
          ONLY DOCUMENTS AND AUDIO.<br/>
          ANONYMITY IS PARAMOUNT.
        </p>

        <p>
          WE ELIMINATE FAKE NEWS, HATE, AND TRASH VIA COLLECTIVE ALGORITHMIC MODERATION.<br/>
          RESTORE INTELLECTUALITY.<br/>
          FREE REPORTING.<br/>
          NO PAYWALLS FOR SCIENTIFIC RESEARCH PUBLICATION OR READING.
        </p>
      </div>

      <div className="mt-12 w-full flex flex-col items-center">
        <div className="mb-8 font-bold border border-black p-4 w-full">
          ACCOUNT CREATION: $10 USD<br/>
          MONTHLY COMMUNITY SUBSCRIPTION: $5 USD
        </div>

        <button
          onClick={handleCryptoPayment}
          disabled={isProcessing}
          className="w-full py-4 px-8 border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-500"
        >
          {isProcessing ? "PROCESSING PAYMENT..." : "PAY WITH CRYPTO (ANONYMOUS)"}
        </button>
        <p className="mt-4 text-xs text-gray-500">
          YOUR USERNAME WILL BE RANDOMLY GENERATED. NO PERSONAL DATA REQUIRED.
        </p>
      </div>
    </main>
  );
}
