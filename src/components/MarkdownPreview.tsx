import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import clsx from "clsx";

type Props = {
  markdown: string;
  className?: string;
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

const MarkdownPreview: React.FC<Props> = ({ markdown, className }) => {
  return (
    <div className={clsx("prose prose-neutral dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          img: (props) => <LazyMarkdownImage {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;


