"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/feed");
        }
      } else {
        // Fallback for mock environment
        if (localStorage.getItem("anonUser")) {
           router.push("/feed");
        }
      }
    };
    checkSession();
  }, [router]);

  const handleGoogleAuth = async () => {
    setIsProcessing(true);
    setErrorMsg("");

    if (!supabase) {
      // Mock flow if no supabase configured
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let anonId = '';
      for (let i = 0; i < 6; i++) {
        anonId += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      localStorage.setItem("anonUser", JSON.stringify({
        id: anonId,
        hasPaidSetup: true, // keeping this in mock to prevent regressions in mock environments just in case
        isSubscribed: true,
        role: 'user'
      }));
      router.push("/feed");
      setIsProcessing(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/feed`
        }
      });

      if (error) throw error;

      // Generation of keys is tricky directly after OAuth redirect because the redirect handles session establishment.
      // E2E keys generation can be handled inside an auth callback or on the feed page when first logging in.
      // For now, let Supabase handle redirect. Feed will manage key creation if missing.

    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred.';
      setErrorMsg(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleViewFeed = () => {
    router.push("/feed");
  };

  const handleDevMockAdmin = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let anonId = '';
    for (let i = 0; i < 6; i++) {
      anonId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    localStorage.setItem("anonUser", JSON.stringify({
      id: anonId,
      hasPaidSetup: true,
      isSubscribed: true,
      role: 'admin'
    }));
    router.push("/feed");
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

      <div className="mt-12 w-full flex flex-col items-center gap-4">
        {errorMsg && <div className="text-red-500 mb-4 uppercase font-bold">{errorMsg}</div>}

        <button
          onClick={handleGoogleAuth}
          disabled={isProcessing}
          className="w-full py-4 px-8 border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-500"
        >
          {isProcessing ? "PROCESSING..." : "SIGN IN WITH GOOGLE"}
        </button>

        <button
          onClick={handleViewFeed}
          disabled={isProcessing}
          className="w-full py-4 px-8 border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-500"
        >
          CONTINUE AS GUEST
        </button>

        {!supabase && (
           <button
              onClick={handleDevMockAdmin}
              className="mt-6 text-xs font-mono font-bold uppercase underline"
           >
              DEV: FILL MOCK ADMIN
           </button>
        )}

        <p className="mt-4 text-xs text-gray-500 font-mono">
          YOUR ANONYMOUS ID WILL BE RANDOMLY GENERATED. NO OTHER DATA REQUIRED.
        </p>
      </div>
    </main>
  );
}
