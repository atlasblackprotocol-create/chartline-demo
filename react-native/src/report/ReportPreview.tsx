import React from 'react';
import { WebView } from 'react-native-webview';

/** Shows the report HTML exactly as it will print. */
export function ReportPreview({ html }: { html: string }) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      scalesPageToFit
    />
  );
}
