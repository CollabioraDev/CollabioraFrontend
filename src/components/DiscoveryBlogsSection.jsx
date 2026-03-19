import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DISCOVERY_BLOGS } from "../data/discoveryBlogs.js";

export default function DiscoveryBlogsSection() {
  return (
    <section className="mb-8">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#2F3C96]">Blogs</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DISCOVERY_BLOGS.map((blog) => (
          <article
            key={blog.slug}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
          >
            <img
              src={blog.image}
              alt={blog.title}
              className="w-full h-44 object-cover"
              loading="lazy"
            />
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 overflow-hidden">
                <span className="min-w-0 truncate">{blog.category}</span>
                <span className="shrink-0">•</span>
                <span className="shrink-0">{blog.readTime}</span>
                <span className="shrink-0">•</span>
                <span className="shrink-0">{blog.publishedAt}</span>
              </div>

              <h3 className="text-[1.05rem] leading-6 font-semibold text-slate-900 mb-1 line-clamp-2">
                {blog.title}
              </h3>
              <p className="text-sm leading-6 text-slate-600 mb-4 line-clamp-2">
                {blog.excerpt}
              </p>

              <Link
                to={`/discovery/blogs/${blog.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F3C96] hover:text-brand-blue-600 mt-auto"
              >
                Read full blog
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
