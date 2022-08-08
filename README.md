<h1 align="center">
  <br>
  <a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
  <br>Wellknown-dids client
  <br>
</h1>

[![CI](https://github.com/Sphereon-Opensource/wellknown-dids-client/actions/workflows/main.yml/badge.svg)](https://github.com/Sphereon-Opensource/wellknown-dids-client/actions/workflows/main.yml)  [![codecov](https://codecov.io/gh/Sphereon-Opensource/wellknown-dids-client/branch/develop/graph/badge.svg?token=9P1JGUYA35)](https://codecov.io/gh/Sphereon-Opensource/wellknown-dids-client) [![NPM Version](https://img.shields.io/npm/v/@sphereon/wellknown-dids-client.svg)](https://npm.im/@sphereon/wellknown-dids-client)

### Wellknown-dids client
The wellknown-dids-client is a library to create DID configuration resources and domain linkage credentials and to be able to verify these. 
It is written in Typescript and can be compiled to any target JavaScript version.

### Supported actions
 * Creating a DID configuration resource.
 * Creating a domain linkage credential.
 * Verifying domain linkage based on a DID document.
 * Verifying an endpoint descriptor.
 * Verifying a DID configuration resource (option for remote possible).
 * Verifying a domain linkage credential (JWT or JSONLD).

### Requirements
#### Well-Known DID issuer
For the well-known DID issuer, an issue callback is required that does the actual issuing of the credential. This can be supplied by using a config to the issuer or as a parameter to the functions.
#### Well-Known DID verifier
For the well-known DIr verifier, a verification callback is required that does the signature verification of the credential. This can be supplied by using a config to the issuer or as a parameter to the functions.

#### Examples

NOTE: VC-JS is being used as an example. Any issuer should be able to be used.

##### DID configuration resource creation
 ```typescript
import { WellKnownDidIssuer } from '@sphereon/wellknown-dids-client';
import vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

const issueCallback = async (args: IIssueCallbackArgs): Promise<any> => {
  const keyPair = await Ed25519VerificationKey2020.generate();
  const suite = new Ed25519Signature2020({key: keyPair});
  suite.verificationMethod = args.credential.credentialSubject.id
  const { defaultDocumentLoader } = vc;

  return await vc.issue({ credential: args.credential, suite, documentLoader: defaultDocumentLoader });
};

const issuer: WellKnownDidIssuer = new WellKnownDidIssuer({
  issueCallback: (args: IIssueCallbackArgs) => issueCallback(args),
});

const args = {
  issuances: [
    {
      did: 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
      origin: 'https://example.com',
      issuanceDate: new Date().toDateString(),
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    },
  ],
};

issuer.issueDidConfigurationResource(args) 
  .then(result => 'success')
  .catch(error => 'failed');
 ```

##### Domain linkage credential creation
 ```typescript
import { WellKnownDidIssuer } from '@sphereon/wellknown-dids-client';
import vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

const issueCallback = async (args: IIssueCallbackArgs): Promise<any> => {
  const keyPair = await Ed25519VerificationKey2020.generate();
  const suite = new Ed25519Signature2020({key: keyPair});
  suite.verificationMethod = args.credential.credentialSubject.id
  const { defaultDocumentLoader } = vc;

  return await vc.issue({ credential: args.credential, suite, documentLoader: defaultDocumentLoader });
};

const issuer: WellKnownDidIssuer = new WellKnownDidIssuer();

const args = {
  issuances: [
    {
      did: 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
      origin: 'https://example.com',
      issuanceDate: new Date().toDateString(),
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN },
      issueCallback: (args: IIssueCallbackArgs) => issueCallback(args)
    },
  ],
};

issuer.issueDomainLinkageCredential(args)
  .then(result => 'success')
  .catch(error => 'failed');
 ```

##### Domain linkage verification
 ```typescript
import { WellKnownDidIssuer } from '@sphereon/wellknown-dids-client';
import vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

const verifySignatureCallback = async (args: IVerifyCallbackArgs): Promise<IVerifyCredentialResult> => {
  const keyPair = await getKeyPair();
  const suite = new Ed25519Signature2020({key: keyPair});
  const { defaultDocumentLoader } = vc;
  
  return await vc.verifyCredential({ credential: args.credential, suite, documentLoader: defaultDocumentLoader });
}

const verifier: WellKnownDidVerifier = new WellKnownDidVerifier({
  verifySignatureCallback: (args: IVerifyCallbackArgs) => verifySignatureCallback(args),
});

const didDoccument = {
  ...
};

verifier.verifyDomainLinkage({ didDoccument, onlyVerifyServiceDid: false })
  .then(result => 'success')
  .catch(error => 'failed');
 ```

##### DID configuration resource verification
 ```typescript
import { WellKnownDidIssuer } from '@sphereon/wellknown-dids-client';
import vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

const verifySignatureCallback = async (args: IVerifyCallbackArgs): Promise<IVerifyCredentialResult> => {
  const keyPair = await getKeyPair();
  const suite = new Ed25519Signature2020({key: keyPair});
  const { defaultDocumentLoader } = vc;

  return await vc.verifyCredential({ credential: args.credential, suite, documentLoader: defaultDocumentLoader });
}

const verifier: WellKnownDidVerifier = new WellKnownDidVerifier();

const didConfigurationResource = {
  '@context': 'https://identity.foundation/.well-known/did-configuration/v1',
  linked_dids: [
    {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://identity.foundation/.well-known/did-configuration/v1'
      ],
      'issuer': 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
      'issuanceDate': '2020-12-04T14:08:28-06:00',
      'expirationDate': '2025-12-04T14:08:28-06:00',
      'type': [
        'VerifiableCredential',
        'DomainLinkageCredential'
      ],
      'credentialSubject': {
        'id': 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
        'origin': 'https://identity.foundation'
      },
      'proof': {
        'type': 'Ed25519Signature2018',
        'created': '2020-12-04T20:08:28.540Z',
        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..D0eDhglCMEjxDV9f_SNxsuU-r3ZB9GR4vaM9TYbyV7yzs1WfdUyYO8rFZdedHbwQafYy8YOpJ1iJlkSmB4JaDQ',
        'proofPurpose': 'assertionMethod',
        'verificationMethod': 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM#z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM'
      },
      'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6b3RoZXIiLCJuYmYiOjE2MDcxMTI3MzksInN1YiI6ImRpZDprZXk6b3RoZXIiLCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vaWRlbnRpdHkuZm91bmRhdGlvbi8ud2VsbC1rbm93bi9kaWQtY29uZmlndXJhdGlvbi92MSJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDprZXk6b3RoZXIiLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6b3RoZXIiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiRG9tYWluTGlua2FnZUNyZWRlbnRpYWwiXX19.rRuc-ojuEgyq8p_tBYK7BayuiNTBeXNyAnC14Rnjs-jsnhae4_E1Q12W99K2NGCGBi5KjNsBcZmdNJPxejiKPrjjcB99poFCgTY8tuRzDjVo0lIeBwfx9qqjKHTRTUR8FGM_imlOpVfBF4AHYxjkHvZn6c9lYvatYcDpB2UfH4BNXkdSVrUXy_kYjpMpAdRtyCAnD_isN1YpEHBqBmnfuVUbYcQK5kk6eiokRFDtWruL1OEeJMYPqjuBSd2m-H54tSM84Oic_pg2zXDjjBlXNelat6MPNT2QxmkwJg7oyewQWX2Ot2yyhSp9WyAQWMlQIe2x84R0lADUmZ1TPQchNw'
    ],
  };

  verifier.verifyResource({ 
    configuration: didConfigurationResource,
    did: 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
    verifySignatureCallback: (args: IVerifyCallbackArgs) => verifySignatureCallback(args),
  })
  .then(result => 'success')
  .catch(error => 'failed');
 ```

### Build
```shell
yarn build
```

### Test
The test command runs:
* `eslint`
* `prettier`
* `unit`
* `coverage`

You can also run only a single section of these tests, using for example `yarn test:unit`.
```shell
yarn test
```

### Utility scripts
There are several other utility scripts that help with development.

* `yarn fix` - runs `eslint --fix` as well as `prettier` to fix code style.
* `yarn cov` - generates code coverage report.
