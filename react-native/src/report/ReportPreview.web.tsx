import React from 'react';

/** react-native-webview has no web build, so the browser preview uses an iframe. */
export function ReportPreview({ html }: { html: string }) {
  return React.createElement('iframe', {
    srcDoc: html,
    title: 'Health report preview',
    style: { flex: 1, width: '100%', height: '100%', border: 'none', background: '#FFFFFF' },
  });
}
