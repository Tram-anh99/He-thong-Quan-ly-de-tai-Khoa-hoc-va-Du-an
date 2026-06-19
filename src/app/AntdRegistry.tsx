"use client";

import React from "react";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";

export default function AntdRegistry({
     children,
}: {
     children: React.ReactNode;
}) {
     const cache = React.useMemo(() => createCache(), []);
     const isServerInserted = React.useRef(false);

     useServerInsertedHTML(() => {
          if (isServerInserted.current) return;
          isServerInserted.current = true;
          return (
               <style
                    id="antd"
                    dangerouslySetInnerHTML={{
                         __html: extractStyle(cache, true),
                    }}
               />
          );
     });

     return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
