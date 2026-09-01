import { Post as PostType } from "@/lib/mockData";

interface PostProps {
  post: PostType;
  onFlag: (id: string) => void;
}

export default function Post({ post, onFlag }: PostProps) {
  return (
    <article className="border border-black p-6 mb-8 bg-white">
      <header className="mb-4 border-b border-black pb-2 flex justify-between items-baseline">
        <h2 className="text-xl font-bold uppercase tracking-tight">{post.title}</h2>
        <span className="text-sm font-mono uppercase">AUTHOR: {post.authorId}</span>
      </header>

      <div className="mb-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {post.type === 'audio' ? (
          <div className="p-4 border border-black bg-gray-50 flex items-center justify-center italic">
            {post.content}
          </div>
        ) : (
          post.content
        )}
      </div>

      <footer className="flex justify-between items-center border-t border-black pt-4">
        <span className="text-xs uppercase">
          TYPE: {post.type} | FLAGS: {post.flags}
        </span>
        <button
          onClick={() => onFlag(post.id)}
          className="text-xs py-2 px-4 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors"
        >
          FLAG AS FAKE NEWS
        </button>
      </footer>
    </article>
  );
}
