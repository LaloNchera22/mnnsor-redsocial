"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/crypto";




export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
    setSuccessMsg("");

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
        isSubscribed: true,
        role: username.includes('admin') || username.includes('e2e') ? 'admin' : 'user'
      }));
      router.push("/feed");
      return;
    }

    try {
      if (isResetMode) {
         const { error } = await supabase.auth.resetPasswordForEmail(username.trim());
         if (error) throw error;
         setSuccessMsg("PASSWORD RECOVERY EMAIL SENT.");
         setIsResetMode(false);
         return;
      }


      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: username.trim(),
          password,
        });
        if (signInError) throw signInError;


        if (data.user) {
          // Check if we need to generate keys
          let publicKeyStr = '';
          if (!localStorage.getItem("privateKey")) {
             const keyPair = await generateKeyPair();
             publicKeyStr = await exportPublicKey(keyPair.publicKey);
             const privateKeyStr = await exportPrivateKey(keyPair.privateKey);
             localStorage.setItem("privateKey", privateKeyStr);
          }

          // Wait briefly for the trigger to create the profile
          await new Promise(r => setTimeout(r, 1000));

          if (publicKeyStr) {
             const { data: profile } = await supabase.from('profiles').select('public_key').eq('id', data.user.id).single();
             if (profile && !profile.public_key) {
                await supabase.from('profiles').update({ public_key: publicKeyStr }).eq('id', data.user.id);
             }
          }

          // Real email verification note

          if (data.session === null) {
             setSuccessMsg("VERIFY YOUR EMAIL ADDRESS BEFORE CONTINUING.");
          }

          try {
            // Pass data.user.id for Stripe reference instead of anonId to ensure exact match in Webhook
            const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id, type: 'setup' })
            });
            const { url, error: checkoutError } = await res.json();
            if (checkoutError) throw new Error(checkoutError);
            if (url) {
               window.location.href = url;
            } else {
               router.push("/feed");
            }
          } catch (checkoutErr: Error | unknown) {
            console.error("Checkout error:", checkoutErr);
            router.push("/feed"); // Fallback if stripe is not configured
          }
        }
      }
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred.';
      setErrorMsg(errorMessage);
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
        {successMsg && <div className="text-green-600 mb-4 uppercase font-bold">{successMsg}</div>}

        <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="EMAIL ADDRESS"
            required
            className="w-full p-4 border border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
          />
          {!isResetMode && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              required
              className="w-full p-4 border border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
            />
          )}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-8 border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-500"
          >
            {isProcessing ? "PROCESSING..." : isResetMode ? "SEND RECOVERY EMAIL" : isLogin ? "LOGIN" : "PAY WITH CRYPTO & SIGN UP"}
          </button>
        </form>

        <div className="flex flex-col gap-2 mt-4 items-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setIsResetMode(false); }}
            className="text-xs font-mono uppercase underline hover:text-gray-600"
          >
            {isLogin ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? LOGIN"}
          </button>

          <button
            onClick={() => { setIsResetMode(!isResetMode); setIsLogin(true); }}
            className="text-xs font-mono uppercase underline hover:text-gray-600"
          >
            {isResetMode ? "BACK TO LOGIN" : "FORGOT PASSWORD?"}
          </button>
        </div>

        {!supabase && (
           <button
              onClick={() => { setUsername('admin@admin.com'); setPassword('mock'); setIsLogin(true); setIsResetMode(false); }}
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
