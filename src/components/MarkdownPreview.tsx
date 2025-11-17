import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import clsx from "clsx";

type Props = {
  markdown: string;
  className?: string;
  // Map like { "local:1": "blob:..." }
  localMap?: Record<string, string>;
};

const LazyMarkdownImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: "100px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      {...props}
      loading="lazy"
      className={clsx("transition-opacity duration-500", visible ? "opacity-100" : "opacity-0", props.className)}
    />
  );
};

const MarkdownPreview: React.FC<Props> = ({ markdown, className, localMap }) => {
  return (
    <div className={clsx("prose prose-neutral dark:prose-invert max-w-none prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          img: (props) => {
            // Resolve preview-only local asset placeholders
            const src = props.src || "";
            const resolved = src.startsWith("local:") && localMap ? (localMap[src] || src) : src;
            const baseClass = "my-4 w-full max-w-full rounded-xl border border-border/40 object-cover";
            const composedClass = props.className ? `${baseClass} ${props.className}` : baseClass;
            return <LazyMarkdownImage {...props} className={composedClass} src={resolved} />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;


