const vc = require('@digitalcredentials/vc');
const { extendContextLoader } = require('jsonld-signatures');

export class DocumentLoader {
  getLoader() {
    return extendContextLoader(async (url: string) => {
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          const document = await response.json();
          return {
            contextUrl: null,
            documentUrl: url,
            document,
          };
        }
      } catch (error: any) {
        throw new Error(error);
      }

      const { defaultDocumentLoader } = vc;
      return defaultDocumentLoader(url);
    });
  }
}
