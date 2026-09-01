"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
        hasPaidSetup: true,
        isSubscribed: true
      }));
      router.push("/feed");
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/feed");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          // Generate anon ID
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let anonId = '';
          for (let i = 0; i < 6; i++) {
            anonId += characters.charAt(Math.floor(Math.random() * characters.length));
          }

          // In a real app with RLS, the user creates their profile, or a trigger handles it.
          // Since we might hit RLS if we do it directly from client without setup, we will just proceed to checkout.
          // We will store anon_id in metadata or similar, but for simplicity here we assume the trigger handles anon_id,
          // or we handle checkout which updates the profile via webhook.

          try {
            const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: anonId, type: 'setup' }) // using anonId as reference for now
            });
            const { url, error: checkoutError } = await res.json();
            if (checkoutError) throw new Error(checkoutError);
            if (url) {
               window.location.href = url;
            } else {
               router.push("/feed");
            }
          } catch (checkoutErr: any) {
            console.error("Checkout error:", checkoutErr);
            router.push("/feed"); // Fallback if stripe is not configured
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsProcessing(false);
    }
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

        <div className="border-t border-black pt-8 mt-8">
          <h2 className="text-lg font-bold mb-4 tracking-tighter uppercase">The Manifesto of Free Knowledge</h2>
          <p className="mb-4 leading-relaxed">
            &quot;INFORMATION WANTS TO BE FREE.&quot; WE BELIEVE IN THE UNHINDERED FLOW OF IDEAS AS THE ULTIMATE CATALYST FOR HUMAN EVOLUTION. KNOWLEDGE MUST TRANSIT WITHOUT BORDERS, WITHOUT CENSORSHIP, AND WITHOUT CORPORATE CHAINS.
          </p>
          <div className="border border-black p-4 mt-6 bg-black text-white">
            <h3 className="text-md font-bold mb-2 tracking-widest uppercase">$100,000 USD REWARD</h3>
            <p className="text-sm">
              AWARDED TO THE AUTHOR OF THE BEST ARTICLE OF 2026 THAT HELPS THE MOST PEOPLE GLOBALLY. TRUTH IS ITS OWN REWARD, BUT WE REWARD IT FURTHER.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 w-full flex flex-col items-center">
        <div className="mb-8 font-bold border border-black p-4 w-full">
          ACCOUNT CREATION: $10 USD<br/>
          MONTHLY COMMUNITY SUBSCRIPTION: $5 USD
        </div>

        {errorMsg && <div className="text-red-500 mb-4 uppercase font-bold">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="EMAIL (NEVER SHARED)"
            required
            className="w-full p-4 border border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PASSWORD"
            required
            className="w-full p-4 border border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-8 border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-500"
          >
            {isProcessing ? "PROCESSING..." : isLogin ? "LOGIN" : "PAY WITH CRYPTO & SIGN UP (ANONYMOUS)"}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 text-xs font-mono uppercase underline hover:text-gray-600"
        >
          {isLogin ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? LOGIN"}
        </button>

        <p className="mt-4 text-xs text-gray-500 font-mono">
          YOUR USERNAME WILL BE RANDOMLY GENERATED. NO PERSONAL DATA REQUIRED.
        </p>
      </div>
    </main>
  );
}
