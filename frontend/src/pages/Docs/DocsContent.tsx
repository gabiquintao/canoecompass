import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import docsMarkdown from '../../../../docs.md?raw';

let mermaidId = 0;

function MermaidChart({ chart, isDark }: { chart: string; isDark: boolean }) {
    const [svg, setSvg] = useState<string>('');
    const idRef = useRef(`mermaid-${++mermaidId}`);

    useEffect(() => {
        let mounted = true;
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'neutral',
            securityLevel: 'loose'
        });

        // Use setTimeout to avoid synchronous render blocking
        setTimeout(() => {
            mermaid.render(idRef.current, chart).then((result) => {
                if (mounted) setSvg(result.svg);
            }).catch((err) => {
                if (mounted) setSvg(`<pre>${err.message}</pre>`);
                console.error("Mermaid error:", err);
            });
        }, 0);

        return () => { mounted = false; };
    }, [chart, isDark]);

    return (
        <div 
            className="mermaid" 
            dangerouslySetInnerHTML={{ __html: svg || 'Rendering chart...' }} 
        />
    );
}

export function DocsContent({ isDark = false }: { isDark?: boolean }) {
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
                                <MermaidChart 
                                    chart={String(children).replace(/\n$/, '')} 
                                    isDark={isDark} 
                                />
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
