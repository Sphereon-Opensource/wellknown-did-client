import nock from 'nock';

import { CONTEXT_URLS } from '../lib/constants';
import { IVerifyCredentialResult, ServiceTypesEnum, ValidationStatusEnum } from '../lib/types';
import { DomainLinkageVerifier } from '../lib/verifier/DomainLinkageVerifier';

const DID = 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM';
const ORIGIN = 'https://example.com';
const CREDENTIAL = {
  '@context': ['https://www.w3.org/2018/credentials/v1', 'https://identity.foundation/.well-known/did-configuration/v1'],
  issuer: DID,
  issuanceDate: '2022-12-04T14:08:28-06:00',
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
};
const DOCUMENT = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://identity.foundation/.well-known/did-configuration/v1'],
  id: DID,
  verificationMethod: [
    {
      id: `${DID}#_Qq0UL2Fq651Q0Fjd6TvnYE-faHiOpRlPVQcY_-tA4A`,
      type: 'JsonWebKey2020',
      controller: DID,
      publicKeyJwk: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'VCpo2LMLhn6iWku8MKvSLg2ZAoC-nlOyPVQaO3FxVeQ',
      },
    },
  ],
  service: [
    {
      id: `${DID}#foo`,
      type: ServiceTypesEnum.LINKED_DOMAINS,
      serviceEndpoint: {
        origins: [ORIGIN, ORIGIN],
      },
    },
    // {
    //   id: `${DID}#bar`,
    //   type: ServiceTypesEnum.LINKED_DOMAINS,
    //   serviceEndpoint: ORIGIN,
    // },
  ],
};
const DID_CONFIGURATION = {
  '@context': 'https://identity.foundation/.well-known/did-configuration/v1',
  linked_dids: [
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.YZnpPMAW3GdaPXC2YKoJ7Igt1OaVZKq09XZBkptyhxTAyHTkX2Ewtew-JKHKQjyDyabY3HAy1LUPoIQX0jrU0J82pIYT3k2o7nNTdLbxlgb49FcDn4czntt5SbY0m1XwrMaKEvV0bHQsYPxNTqjYsyySccgPfmvN9IT8gRS-M9a6MZQxuB3oEMrVOQ5Vco0bvTODXAdCTHibAk1FlvKz0r1vO5QMhtW4OlRrVTI7ibquf9Nim_ch0KeMMThFjsBDKetuDF71nUcL5sf7PCFErvl8ZVw3UK4NkZ6iM-XIRsLL6rXP2SnDUVovcldhxd_pyKEYviMHBOgBdoNP6fOgRQ',
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6b3RoZXIiLCJuYmYiOjE2MDcxMTI3MzksInN1YiI6ImRpZDprZXk6b3RoZXIiLCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vaWRlbnRpdHkuZm91bmRhdGlvbi8ud2VsbC1rbm93bi9kaWQtY29uZmlndXJhdGlvbi92MSJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDprZXk6b3RoZXIiLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6b3RoZXIiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiRG9tYWluTGlua2FnZUNyZWRlbnRpYWwiXX19.rRuc-ojuEgyq8p_tBYK7BayuiNTBeXNyAnC14Rnjs-jsnhae4_E1Q12W99K2NGCGBi5KjNsBcZmdNJPxejiKPrjjcB99poFCgTY8tuRzDjVo0lIeBwfx9qqjKHTRTUR8FGM_imlOpVfBF4AHYxjkHvZn6c9lYvatYcDpB2UfH4BNXkdSVrUXy_kYjpMpAdRtyCAnD_isN1YpEHBqBmnfuVUbYcQK5kk6eiokRFDtWruL1OEeJMYPqjuBSd2m-H54tSM84Oic_pg2zXDjjBlXNelat6MPNT2QxmkwJg7oyewQWX2Ot2yyhSp9WyAQWMlQIe2x84R0lADUmZ1TPQchNw',
  ],
};

let verifier: DomainLinkageVerifier;

const verifyCallback = async (): Promise<IVerifyCredentialResult> => {
  return { verified: true };
};

beforeAll(() => {
  verifier = new DomainLinkageVerifier({
    verifySignatureCallback: () => verifyCallback(),
    onlyValidateServiceDid: false,
  });
});

describe('Domain Linkage Verifier', () => {
  it('should verify domain linkage from a given did document', async () => {
    nock(ORIGIN).get('/.well-known/did-configuration.json').times(3).reply(200, DID_CONFIGURATION);

    const result = await verifier.verifyDomainLinkage({ didDocument: DOCUMENT });

    expect(result.status).toEqual(ValidationStatusEnum.VALID);
  });

  it('should only verify service DIDs when onlyValidateServiceDid is true', async () => {
    nock(ORIGIN).get('/.well-known/did-configuration.json').times(3).reply(200, DID_CONFIGURATION);

    const result = await verifier.setOnlyValidateServiceDid(true).verifyDomainLinkage({ didDocument: DOCUMENT });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(result.endpointDescriptors[0].resources[0].credentials.length).toEqual(1);
  });

  describe('Endpoint Descriptors', () => {
    it('should verify when serviceEndpoint is of type string', async () => {
      nock(ORIGIN).get('/.well-known/did-configuration.json').times(1).reply(200, DID_CONFIGURATION);

      const endpointDescriptor = {
        id: DID,
        type: ServiceTypesEnum.LINKED_DOMAINS,
        serviceEndpoint: ORIGIN,
      };

      const result = await verifier.verifyEndpointDescriptor({ descriptor: endpointDescriptor });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should verify when serviceEndpoint is of type IServiceEndpoint', async () => {
      nock(ORIGIN).get('/.well-known/did-configuration.json').times(1).reply(200, DID_CONFIGURATION);

      const endpointDescriptor = {
        id: DID,
        type: ServiceTypesEnum.LINKED_DOMAINS,
        serviceEndpoint: {
          origins: [ORIGIN],
        },
      };

      const result = await verifier.verifyEndpointDescriptor({ descriptor: endpointDescriptor });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should reject when endpoint descriptor has an id which is not a did', async () => {
      const endpointDescriptor = {
        id: 'example_value',
        type: ServiceTypesEnum.LINKED_DOMAINS,
        serviceEndpoint: {
          origins: ['https://example.com'],
        },
      };

      await expect(verifier.verifyEndpointDescriptor({ descriptor: endpointDescriptor })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property id is not a valid did url',
      });
    });

    it('should reject when serviceEndpoint origins contains invalid origin', async () => {
      const endpointDescriptor = {
        id: DID,
        type: ServiceTypesEnum.LINKED_DOMAINS,
        serviceEndpoint: {
          origins: ['https://example.com/path'],
        },
      };

      await expect(verifier.verifyEndpointDescriptor({ descriptor: endpointDescriptor })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property origins contains an invalid origins',
      });
    });

    it('should reject when serviceEndpoint contains invalid origin', async () => {
      const endpointDescriptor = {
        id: DID,
        type: ServiceTypesEnum.LINKED_DOMAINS,
        serviceEndpoint: 'https://example.com/path',
      };

      await expect(verifier.verifyEndpointDescriptor({ descriptor: endpointDescriptor })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property serviceEndpoint does not contain a valid origin',
      });
    });
  });

  describe('DID Configuration Resource', () => {
    it('should verify did configuration resource', async () => {
      const result = await verifier.verifyResource({ configuration: DID_CONFIGURATION });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should verify did configuration resource from well-known location', async () => {
      nock(ORIGIN).get('/.well-known/did-configuration.json').times(1).reply(200, DID_CONFIGURATION);

      const result = await verifier.verifyResource({ origin: ORIGIN });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should only verify specific dids', async () => {
      const result = await verifier.verifyResource({
        configuration: DID_CONFIGURATION,
        did: 'did:key:z6MkoTHsgNNrby8JzCNQ1iRLyW5QQ6R8Xuu6AA8igGrMVPUM',
      });

      expect(result.credentials?.length).toEqual(1);
    });

    it('should verify all credentials when no did is provided', async () => {
      const result = await verifier.verifyResource({ configuration: DID_CONFIGURATION });

      expect(result.credentials?.length).toEqual(2);
    });

    it('should reject if linked_dids is empty', async () => {
      const resource = {
        '@context': CONTEXT_URLS.IDENTITY_FOUNDATION_WELL_KNOWN_DID,
        linked_dids: [],
      };

      await expect(verifier.verifyResource({ configuration: resource })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property linked_dids does not contain any domain linkage credentials',
      });
    });

    it('should be able to verify a did configuration resource from a well-known location', async () => {
      const result = await verifier.verifyResource({ origin: 'https://identity.foundation' });
      console.log(result); // TODO fix
    });
  });

  describe('Domain Linkage Credential', () => {
    it('should verify linked data proof credential', async () => {
      const result = await verifier.verifyDomainLinkageCredential({ credential: CREDENTIAL });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should verify json web token proof credential', async () => {
      const result = await verifier.verifyDomainLinkageCredential({
        credential:
          'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.YZnpPMAW3GdaPXC2YKoJ7Igt1OaVZKq09XZBkptyhxTAyHTkX2Ewtew-JKHKQjyDyabY3HAy1LUPoIQX0jrU0J82pIYT3k2o7nNTdLbxlgb49FcDn4czntt5SbY0m1XwrMaKEvV0bHQsYPxNTqjYsyySccgPfmvN9IT8gRS-M9a6MZQxuB3oEMrVOQ5Vco0bvTODXAdCTHibAk1FlvKz0r1vO5QMhtW4OlRrVTI7ibquf9Nim_ch0KeMMThFjsBDKetuDF71nUcL5sf7PCFErvl8ZVw3UK4NkZ6iM-XIRsLL6rXP2SnDUVovcldhxd_pyKEYviMHBOgBdoNP6fOgRQ',
      });

      expect(result.status).toEqual(ValidationStatusEnum.VALID);
    });

    it('should reject if issuanceDate is not a valid date value', async () => {
      await expect(verifier.verifyDomainLinkageCredential({ credential: { ...CREDENTIAL, issuanceDate: 'invalid_value' } })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property issuanceDate is not a valid date',
      });
    });

    it('should reject if expirationDate is not a valid date value', async () => {
      await expect(verifier.verifyDomainLinkageCredential({ credential: { ...CREDENTIAL, expirationDate: 'invalid_value' } })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property expirationDate is not a valid date',
      });
    });

    it('should reject if credentialSubject.id is not a valid did', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential: { ...CREDENTIAL, credentialSubject: { ...CREDENTIAL.credentialSubject, id: 'invalid_did' } },
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.id is not a valid did url' });
    });

    it('should reject if credentialSubject.id does not match present issuer value', async () => {
      await expect(verifier.verifyDomainLinkageCredential({ credential: { ...CREDENTIAL, issuer: 'did:key:other' } })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property credentialSubject.id does not match issuer property',
      });
    });

    it('should reject if credentialSubject.id does not match present subject value', async () => {
      await expect(verifier.verifyDomainLinkageCredential({ credential: { ...CREDENTIAL, subject: 'did:key:other' } })).rejects.toEqual({
        status: ValidationStatusEnum.INVALID,
        message: 'Property credentialSubject.id does not match subject property',
      });
    });

    it('should reject if credentialSubject.origin is not valid domain value', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential: { ...CREDENTIAL, credentialSubject: { ...CREDENTIAL.credentialSubject, origin: 'invalid_origin' } },
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.origin is not a valid origin' });
    });

    it('should reject if kid is not present in JWT header', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.FHzxFzKCiyznW0uGvJ_NjU9Q6NlEyq4REGyjnD24TPPSgwxDv3FF8Rj3MR7GjT_buE66dp5ZRMCEgvBQK3iOlf3-yI9XO5pJLKlBU1AD1R7AkrDTEvKi6BsWutX83PsOL2loz-1xuBed0mJT7MmliVbCEBDUbKrSQtX7pDUlvSy_JdX1ywVaLBd4DsbsjxsTnKxoFjd2bqrdTG9CysaVz-cBckvwbxLewLLNtMn2QMtNr2_BUgYg0D9w6awSM2xU528C575ornSqxUlN5htE1bHR7U_tnsJjNzfSfkY51loBn5YCbNQD4dLimzVZhq32TfG5YSsIsEdk00al94wVYQ',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property kid is not present in JWT header' });
    });

    it('should reject if JWT header has additional properties', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsImFkZGl0aW9uYWxfZmllbGQiOiJ2YWx1ZSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.cXqXYTPQjyDgWG0XP4QEyoX2QwVIYdii4bWHX3Eeg5VylrQaSNXddWNUOiQ47wtfihbOaE9k52iaIb9_qhci-uk1An0FyDZOzuzAfo3tfCR1kBFyY72VxxAoxEqdVTqPoIlJMU-79Fp8WUiB9hukbatoFP98rbaSO2wEugaD-FBjcBB6j_-xxWYiKWtivE526LBDn4JhiKlDcI--k1dG9qtqfriD344QdI9Jox80FDZpRIolNAXK_HTvBbHwNSMpdu9r4rbs4zfVsSOsdTSwu8uvBXSxi8u9VUUyhQq--L8WGSXLjncb5BgiBWSR7YZsjWcCYlS8vkLpsltHxdq00g',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'JWT header contains additional properties' });
    });

    it('should reject if iss is not present in JWT payload', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksIm5iZiI6MTYwNzExMjczOSwic3ViIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vaWRlbnRpdHkuZm91bmRhdGlvbi8ud2VsbC1rbm93bi9kaWQtY29uZmlndXJhdGlvbi92MSJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwib3JpZ2luIjoiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uIn0sImV4cGlyYXRpb25EYXRlIjoiMjAyNS0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VhbmNlRGF0ZSI6IjIwMjAtMTItMDRUMTQ6MTI6MTktMDY6MDAiLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb21haW5MaW5rYWdlQ3JlZGVudGlhbCJdfX0.e9aNtnNJhqgCWwuQsgYYxFoL04TPLLyXmJRyvxKPfPH22EOjrXLGPGEaWoHvPyK1GjS3RrnmGDnydGAaprOL2WqYUTZGHlZjI4m5w00AR14hghytOFys84OT0RSdE4fsEt2Lro6aCAG5RdCurX7DYqDslS7htkuMQMGzqchXEazmzSXJ7OoElg9mh0YxQw0xPONf3KBnrJP7UiL2ygtxUWMcMvFyG79t-zxATREqwmBjJKZTzngD75t9dPAJs6DJPMkyp4FyD7jDQwJABR0IOHlENs-bB3uWecrnnAFJGxmeX0i2JTEcvsdqeepdMm8PwDVrmdziKD50xiiPVYIwJA',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property iss is not present in JWT payload' });
    });

    it('should reject if sub is not present in JWT payload', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vaWRlbnRpdHkuZm91bmRhdGlvbi8ud2VsbC1rbm93bi9kaWQtY29uZmlndXJhdGlvbi92MSJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwib3JpZ2luIjoiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uIn0sImV4cGlyYXRpb25EYXRlIjoiMjAyNS0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VhbmNlRGF0ZSI6IjIwMjAtMTItMDRUMTQ6MTI6MTktMDY6MDAiLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb21haW5MaW5rYWdlQ3JlZGVudGlhbCJdfX0.gCXulAWRv29SrMsSG1Hdsn34eArQsITMCTajgvcP4JxdNu-peq9cYOAoWN-nBK4oub5e5fQwo39a1TUvVwKj3ykTuQ0jrl_bozwA4tNUL-snNsSO657SR0Od9iZD7-Izk6PNbHWosLvvFx1skpJjKNzN-FXonPopw2yI7sDzeJtbzX-WFdaUxdDe37VQPQ2QKMo9T9HaWiY_-gQvSSQ1pHsJvq_Vs8UIYyBDVUfEoP_8h9vb9oQDXXhTNkZCtW-LPOLjPaf7LK8xqYL8hKsawehVtXaxq1fozEa8t2BqhmRj9O5Ybcy6ISs4IZxMBsoH4u6vrbhB6xeroAuxAZEF1Q',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property sub is not present in JWT payload' });
    });

    it('should reject if vc is not present in JWT payload', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.KHe1HKgqCyv_OFV4JduZ8e6yFr-efafOF128AWUJdN9IrFrnfm9e3OSwRjphn6QToLyikO5gUtVdhh7upgwPrdRa6Y9tyXYAb89R6cf98yiWD6LIS7Pd_saqjr7pwY6XEDK4oUIk5qg-KknTegtLVU-a3YSb5jOJGwnx_7LKFBintQ-YMXVxV7RbYUnil7iCqUBjleYXwpib54rlXvl4BcFiMBB2TWjCn3lABCZxp0iQHDxGmkfC8l_QSCx8Zmz-9u9tBmbuEW3aA85MepX9J3u5ZLhDr8op5n6QzfDLQKFJnxBQC_7ljUpby6mpfByxKZli0pebrl5v7xfKOlfcLw',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property vc is not present in JWT payload' });
    });

    it('should reject if iss does not match credentialSubject id', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6Im90aGVyX3ZhbHVlIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.Jzj6tA9UbiAnzRHIwOGeH2sQCELuSLfw4lBg6aUvnYPJNok5cBYFS36Wd81BgBRpSHwOkH5OINk2bYG_ZG_cvPgtOVDxhIcskj6n-tGW_wG_Kicf8DKKl3EXwUzr8p1EElavgVTehfsjCXrWcvmpyakEUVN-PrmCCG8bd-3rgCKzKuq4EWeN0GMpa9IebmSpKnJW9iwDLlxAyYUt_tWoMbex17THdzbscoLQvRWfYB-libABS0u30__j1bjtGPZUXgiYcG4twWivVACRw2oIFb0d1JYy0jpBuF8aAC8JbTcRktiAd9CJTRJkctcUrrjj_pHfKeTORQGbZ8nGGJfjpA',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property iss does not match credentialSubject id in JWT payload' });
    });

    it('should reject if iss does not match credentialSubject id', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJvdGhlcl92YWx1ZSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.mOik2yXm8BszIbaxWio1OkOL5szcDDQfPUW2j6q30Niqd-rwjJHvK7Hoq_Ld9vQsEg61dM0GIGq3o9EvPtdvfZXLSSd1kz4RVM0Rb_ZFq9_jXagQC07MEXdJ0ou36kr-WND8MMWOV3naDRvObQYELdlzGusUKazXGCVhiI-TNPqGzihqAGsIatiqEgsji5g5AbzJ2NCVg0CXRdESaF1ZVMVUSOzuM-YH2mc9pAvKquntv7vB2kpMt-JY1KF4QJySLiq8ghG7Wr1ew_iw2EVaqbXScd63nUJpiexyXQU7EzFus7wL0wE0NNFltU_Wl8lm9simSw0GSqYBaN-sGmrh0A',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Property sub does not match credentialSubject id in JWT payload' });
    });

    it('should reject if payload has additional properties', async () => {
      await expect(
        verifier.verifyDomainLinkageCredential({
          credential:
            'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsImFkZGl0aW9uYWxfcHJvcGVydHkiOiJ2YWx1ZSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.grcju8cwvrVBGwS7UzVE-Gt0x6ZytBM3XrooqLOX36zLne2XrWmgWNNeB7ESk1Nnjp7tqTwDU4Q0Cg_Jlo0o8IPscR7I5UHk3iD_T8EBdSHKKTVqu8fN_zOUrZmCTgnf2JGl40bHjLIG_PZS8YWB9RoFzAVgTIWs3pAoAnSKJy5rJawBaGSYaEhx1kIfRGEjBCZXM9EUesd3BB9nXyC1QVRjHCxhH_O62Wrdi5CqAIzrRaZln6wAnMXoTD8zbP-5TT_dnbt9aq680zv7TpfuTuvaf60CQR536h7b7yEJqA2GN5lXAVTLGMH0E-n4jZ-tFRyCmDsIfQ0bPhV3iVfQZg',
        })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'JWT payload contains additional properties' });
    });

    it('should reject credfential signature is invalid', async () => {
      const verifyCallback = async (): Promise<IVerifyCredentialResult> => {
        return { verified: false };
      };

      const verifier = new DomainLinkageVerifier({
        verifySignatureCallback: () => verifyCallback(),
        onlyValidateServiceDid: false,
      });

      await expect(
          verifier.verifyDomainLinkageCredential({
            credential:
                'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNI3o2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSJ9.eyJleHAiOjE3NjQ4NzkxMzksImlzcyI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwibmJmIjoxNjA3MTEyNzM5LCJzdWIiOiJkaWQ6a2V5Ono2TWtvVEhzZ05OcmJ5OEp6Q05RMWlSTHlXNVFRNlI4WHV1NkFBOGlnR3JNVlBVTSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly9pZGVudGl0eS5mb3VuZGF0aW9uLy53ZWxsLWtub3duL2RpZC1jb25maWd1cmF0aW9uL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmtleTp6Nk1rb1RIc2dOTnJieThKekNOUTFpUkx5VzVRUTZSOFh1dTZBQThpZ0dyTVZQVU0iLCJvcmlnaW4iOiJodHRwczovL2lkZW50aXR5LmZvdW5kYXRpb24ifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA0VDE0OjEyOjE5LTA2OjAwIiwiaXNzdWFuY2VEYXRlIjoiMjAyMC0xMi0wNFQxNDoxMjoxOS0wNjowMCIsImlzc3VlciI6ImRpZDprZXk6ejZNa29USHNnTk5yYnk4SnpDTlExaVJMeVc1UVE2UjhYdXU2QUE4aWdHck1WUFVNIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvbWFpbkxpbmthZ2VDcmVkZW50aWFsIl19fQ.YZnpPMAW3GdaPXC2YKoJ7Igt1OaVZKq09XZBkptyhxTAyHTkX2Ewtew-JKHKQjyDyabY3HAy1LUPoIQX0jrU0J82pIYT3k2o7nNTdLbxlgb49FcDn4czntt5SbY0m1XwrMaKEvV0bHQsYPxNTqjYsyySccgPfmvN9IT8gRS-M9a6MZQxuB3oEMrVOQ5Vco0bvTODXAdCTHibAk1FlvKz0r1vO5QMhtW4OlRrVTI7ibquf9Nim_ch0KeMMThFjsBDKetuDF71nUcL5sf7PCFErvl8ZVw3UK4NkZ6iM-XIRsLL6rXP2SnDUVovcldhxd_pyKEYviMHBOgBdoNP6fOgRQ',
          })
      ).rejects.toEqual({ status: ValidationStatusEnum.INVALID, message: 'Signature is invalid' });
    })

  });
});
