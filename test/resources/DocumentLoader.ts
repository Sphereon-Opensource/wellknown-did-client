import fetch from 'cross-fetch';

const { extendContextLoader } = require('@digitalcredentials/jsonld-signatures');
const vc = require('@digitalcredentials/vc');

export class DocumentLoader {
  getLoader() {
    return extendContextLoader(async (url: string) => {
      const response = await fetch(url);
      if (response.status === 200) {
        const document = await response.json();
        return {
          contextUrl: null,
          documentUrl: url,
          document,
        };
      }

      const { defaultDocumentLoader } = vc;
      return defaultDocumentLoader(url);
    });
  }
}
