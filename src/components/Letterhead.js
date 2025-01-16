import { Markdown } from "tiptap-markdown";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";
import { unified } from "unified";

export default function Letterhead({ content }) {
  if (!content) return null;

  // Convert markdown to HTML
  const processMarkdown = (markdown) => {
    try {
      const result = unified()
        .use(remarkParse)
        .use(remarkHtml)
        .processSync(markdown);
      return result.toString();
    } catch (error) {
      console.error("Error processing markdown:", error);
      return markdown;
    }
  };

  return (
    <div className="letterhead-container">
      <div
        className="letterhead-content"
        dangerouslySetInnerHTML={{ __html: processMarkdown(content) }}
      />
      <div className="letterhead-separator" />
    </div>
  );
}
