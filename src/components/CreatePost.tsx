"use client";

import { useState } from "react";
import { PostType } from "@/lib/mockData";

interface CreatePostProps {
  onCreate: (title: string, content: string, type: PostType) => void;
}

export default function CreatePost({ onCreate }: CreatePostProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("document");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onCreate(title.trim(), content.trim(), type);

    // Reset
    setTitle("");
    setContent("");
    setIsExpanded(false);
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
              AUDIO (URL)
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
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="HTTPS://..."
              required
            />
          )}
        </div>
      </div>

      <footer className="border-t border-black pt-4 flex justify-end">
        <button
          type="submit"
          disabled={!title.trim() || !content.trim()}
          className="py-2 px-8 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          SUBMIT TO NETWORK
        </button>
      </footer>
    </form>
  );
}
