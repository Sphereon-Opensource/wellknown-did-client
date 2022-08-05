import nock from 'nock';

import { WellKnownDidIssuer } from '../lib/issuer/WellKnownDidIssuer';
import { IIssueCallbackArgs, ISignedDomainLinkageCredential, ProofFormatTypesEnum } from '../lib/types';

const COMPACT_JWT_DOMAIN_LINKAGE_CREDENTIAL =
  'eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJpZGVudGl0eS5mb3VuZGF0aW9uIn0sImV4cGlyYXRpb25EYXRlIjoiMjAyNS0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VhbmNlRGF0ZSI6IjIwMjAtMTItMDRUMTQ6MTI6MTktMDY6MDAiLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb21haW5MaW5rYWdlQ3JlZGVudGlhbCJdfX0.aUFNReA4R5rcX_oYm3sPXqWtso_gjPHnWZsB6pWcGv6m3K8-4JIAvFov3ZTM8HxPOrOL17Qf4vBFdY9oK0HeCQ';
const DID = 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM';
const ORIGIN = 'https://example.com';
const DID_CONFIGURATION = {
  '@context': 'https://identity.foundation/.well-known/did-configuration/v1',
  linked_dids: [
    {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://identity.foundation/.well-known/did-configuration/v1'],
      issuer: DID,
      issuanceDate: '2020-12-04T14:08:28-06:00',
      expirationDate: '2025-12-04T14:08:28-06:00',
      type: ['VerifiableCredential', 'DomainLinkageCredential'],
      credentialSubject: {
        id: DID,
        origin: ORIGIN,
      },
      proof: {
        type: 'Ed25519Signature2018',
        created: '2020-12-04T20:08:28.540Z',
        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..D0eDhglCMEjxDV9f_SNxsuU-r3ZB9GR4vaM9TYbyV7yzs1WfdUyYO8rFZdedHbwQafYy8YOpJ1iJlkSmB4JaDQ',
        proofPurpose: 'assertionMethod',
        verificationMethod: `${DID}#z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM`,
      },
    },
    'eyJhbGciOiJFZERTQSJ9.eyJleHAiOjE3NjQ4Nzg5MDgsImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNTA4LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJpZGVudGl0eS5mb3VuZGF0aW9uIn0sImV4cGlyYXRpb25EYXRlIjoiMjAyNS0xMi0wNFQxNDowODoyOC0wNjowMCIsImlzc3VhbmNlRGF0ZSI6IjIwMjAtMTItMDRUMTQ6MDg6MjgtMDY6MDAiLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb21haW5MaW5rYWdlQ3JlZGVudGlhbCJdfX0.6ovgQ-T_rmYueviySqXhzMzgqJMAizOGUKAObQr2iikoRNsb8DHfna4rh1puwWqYwgT3QJVpzdO_xZARAYM9Dw',
  ],
};

let issuer: WellKnownDidIssuer;

const issueCallback = async (args: IIssueCallbackArgs): Promise<ISignedDomainLinkageCredential | string> => {
  if (args.proofFormat === ProofFormatTypesEnum.JSON_WEB_TOKEN) {
    return COMPACT_JWT_DOMAIN_LINKAGE_CREDENTIAL;
  } else {
    return {
      ...args.credential,
      proof: {
        type: 'Ed25519Signature2018',
        created: '2020-12-04T20:08:28.540Z',
        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..D0eDhglCMEjxDV9f_SNxsuU-r3ZB9GR4vaM9TYbyV7yzs1WfdUyYO8rFZdedHbwQafYy8YOpJ1iJlkSmB4JaDQ',
        proofPurpose: 'assertionMethod',
        verificationMethod: `${DID}#z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM`,
      },
    };
  }
};

beforeAll(() => {
  issuer = new WellKnownDidIssuer({
    issueCallback: (args: IIssueCallbackArgs) => issueCallback(args),
  });
});

describe('Domain Linkage Issuer', () => {
  it('should issue a DID configuration resource with multiple types of credentials', async () => {
    const args = {
      issuances: [
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
        },
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN },
        },
      ],
    };

    const resource = await issuer.issueDidConfigurationResource(args);

    expect(resource).not.toBeNull();
    expect(resource.linked_dids).not.toBeNull();
    expect(resource.linked_dids.length).toEqual(2);
  });

  it('should issue a new DID configuration resource based on existing one, using an origin', async () => {
    nock(ORIGIN).get('/.well-known/did-configuration.json').times(1).reply(200, DID_CONFIGURATION);

    const args = {
      issuances: [
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
        },
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN },
        },
      ],
      origin: ORIGIN,
    };

    const resource = await issuer.issueDidConfigurationResource(args);

    expect(resource).not.toBeNull();
    expect(resource.linked_dids).not.toBeNull();
    expect(resource.linked_dids.length).toEqual(4);
  });

  it('should throw error when origins DID configuration resource is not accessible', async () => {
    const args = {
      issuances: [
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
        },
      ],
      origin: ORIGIN,
    };

    await expect(issuer.issueDidConfigurationResource(args)).rejects.toThrow('Unable to retrieve did configuration resource');
  });

  it('should issue a new DID configuration resource based on existing one, using a did configuration', async () => {
    const args = {
      issuances: [
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
        },
        {
          did: DID,
          origin: ORIGIN,
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
          options: { proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN },
        },
      ],
      configuration: DID_CONFIGURATION,
    };

    const resource = await issuer.issueDidConfigurationResource(args);

    expect(resource).not.toBeNull();
    expect(resource.linked_dids).not.toBeNull();
    expect(resource.linked_dids.length).toEqual(4);
  });

  it('should issue a JSON web token credential', async () => {
    const args = {
      did: DID,
      origin: ORIGIN,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN },
    };

    const credential = await issuer.issueDomainLinkageCredential(args);

    expect(credential).toEqual(COMPACT_JWT_DOMAIN_LINKAGE_CREDENTIAL);
  });

  it('should issue a linked data credential', async () => {
    const issuanceDate = new Date().toISOString();
    const expirationDate = new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString();
    const args = {
      did: DID,
      origin: ORIGIN,
      issuanceDate,
      expirationDate,
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    const credential: ISignedDomainLinkageCredential = (await issuer.issueDomainLinkageCredential(args)) as ISignedDomainLinkageCredential;

    expect(credential).not.toBeNull();
    expect(credential.issuanceDate).toEqual(issuanceDate);
    expect(credential.expirationDate).toEqual(expirationDate);
    expect(credential.issuer).toEqual(DID);
    expect(credential.credentialSubject.id).toEqual(DID);
    expect(credential.credentialSubject.origin).toEqual(ORIGIN);
    expect(credential.proof).not.toBeNull();
  });

  it('should use default issuanceDate when not provided', async () => {
    const args = {
      did: DID,
      origin: ORIGIN,
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    const credential: ISignedDomainLinkageCredential = (await issuer.issueDomainLinkageCredential(args)) as ISignedDomainLinkageCredential;
    expect(credential.issuanceDate).not.toBeNull();
  });

  it('should throw error when did is not a valid DID', async () => {
    const args = {
      did: 'invalid_did',
      origin: ORIGIN,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    await expect(issuer.issueDomainLinkageCredential(args)).rejects.toThrow('invalid did');
  });

  it('should throw error when origin is not a valid origin', async () => {
    const args = {
      did: DID,
      origin: `${ORIGIN}/path`,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    await expect(issuer.issueDomainLinkageCredential(args)).rejects.toThrow('origin is not a valid origin');
  });

  it('should throw error when issuanceDate is not a valid date', async () => {
    const args = {
      did: DID,
      origin: ORIGIN,
      issuanceDate: 'invalid_date',
      expirationDate: new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDay()).toISOString(),
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    await expect(issuer.issueDomainLinkageCredential(args)).rejects.toThrow('issuanceDate is not a valid date');
  });

  it('should throw error when expirationDate is not a valid date', async () => {
    const args = {
      did: DID,
      origin: ORIGIN,
      issuanceDate: new Date().toISOString(),
      expirationDate: 'invalid_date',
      options: { proofFormat: ProofFormatTypesEnum.JSON_LD },
    };

    await expect(issuer.issueDomainLinkageCredential(args)).rejects.toThrow('expirationDate is not a valid date');
  });

});
