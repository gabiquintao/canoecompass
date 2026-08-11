import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import docsMarkdown from '../../../../docs.md?raw';

export function DocsContent() {
    return (
        <div className="docs-markdown-container">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    code(props) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
                        const { node, ref, className, children, ...rest } = props as any;
                        const match = /language-(\w+)/.exec(className || '');
                        if (match && match[1] === 'mermaid') {
                            return (
                                <div className="mermaid">
                                    {String(children).replace(/\n$/, '')}
                                </div>
                            );
                        }
                        return (
                            <code className={className} {...rest}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {docsMarkdown}
            </ReactMarkdown>
        </div>
    );
}
