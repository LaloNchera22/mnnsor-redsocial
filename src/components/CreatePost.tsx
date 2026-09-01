"use client";

import { useState } from "react";
import { PostType } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";

interface CreatePostProps {
  onCreate: (title: string, content: string, type: PostType, tag: string) => void;
}

export default function CreatePost({ onCreate }: CreatePostProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<PostType>("document");
  const [tag, setTag] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We installed 'xss' earlier, let's use it dynamically or via standard import if possible.
  // Actually isomorphic-dompurify or basic xss filtering. We'll use the 'xss' package.
  // We need to import xss. Next.js can handle it.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!title.trim() || !tag.trim()) {
        setIsSubmitting(false);
        return;
      }

      const xss = (await import('xss')).default;
      const sanitizedTitle = xss(title.trim());
      const sanitizedTag = xss(tag.trim());
      let finalContent = "";

      if (type === "document") {
        if (!content.trim()) throw new Error("Content required");
        finalContent = xss(content.trim());
      } else if (type === "audio") {
        if (file && supabase) {
          // Upload real file
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('audio_uploads')
            .upload(filePath, file);

          if (uploadError) {
             throw uploadError;
          }

          const { data } = supabase.storage.from('audio_uploads').getPublicUrl(filePath);
          finalContent = data.publicUrl;
        } else {
           // Fallback to URL input or just use the mock URL
           if (!content.trim()) throw new Error("Audio file or URL required");
           finalContent = xss(content.trim());
        }
      }

      await onCreate(sanitizedTitle, finalContent, type, sanitizedTag);

      // Reset
      setTitle("");
      setContent("");
      setFile(null);
      setTag("");
      setIsExpanded(false);
    } catch (error) {
       console.error("Submit error:", error);
       alert("Error submitting post.");
    } finally {
       setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full mb-8 py-4 px-8 border-2 border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
      >
        PUBLISH NEW CONTENT
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-black p-6 mb-8 bg-white">
      <header className="mb-4 border-b border-black pb-2 flex justify-between items-baseline">
        <h2 className="text-xl font-bold uppercase tracking-tight">NEW SUBMISSION</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-sm font-mono uppercase hover:underline"
        >
          CANCEL
        </button>
      </header>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold uppercase mb-2">TYPE</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-sm uppercase">
              <input
                type="radio"
                value="document"
                checked={type === "document"}
                onChange={() => setType("document")}
                className="accent-black"
              />
              DOCUMENT
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-sm uppercase">
              <input
                type="radio"
                value="audio"
                checked={type === "audio"}
                onChange={() => setType("audio")}
                className="accent-black"
              />
              AUDIO
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase mb-2">TITLE</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-black p-2 font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="ENTER TITLE..."
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase mb-2">CATEGORY / TAG</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full border border-black p-2 font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="ENTER CATEGORY OR TAG..."
            required
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase mb-2">CONTENT</label>
          {type === "document" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-black p-2 font-mono text-sm h-32 focus:outline-none focus:ring-1 focus:ring-black resize-none"
              placeholder="WRITE YOUR DOCUMENT HERE..."
              required
            />
          ) : (
            <div className="flex flex-col gap-2">
               <input
                 type="file"
                 accept="audio/*"
                 onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
                       alert("File size exceeds 10MB limit");
                       e.target.value = "";
                       return;
                    }
                    if (selectedFile && !selectedFile.type.startsWith('audio/')) {
                       alert("Invalid file type. Only audio allowed.");
                       e.target.value = "";
                       return;
                    }
                    setFile(selectedFile);
                 }}
                 className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
               />
               <span className="text-xs text-gray-500 font-mono">OR ENTER URL BELOW:</span>
               <input
                  type="url"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="HTTPS://..."
               />
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-black pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="py-2 px-8 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? <span className="animate-pulse">SUBMITTING...</span> : "SUBMIT TO NETWORK"}
        </button>
      </footer>
    </form>
  );
}
