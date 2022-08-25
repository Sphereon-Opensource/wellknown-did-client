import { parseDid } from '@sphereon/ssi-sdk-core';
import { ServiceEndpoint } from 'did-resolver/lib/resolver';

import WDCErrors from "../constants/Errors";
import {
  ICredentialValidation,
  IDescriptorValidation,
  IDidConfigurationResource,
  IDomainLinkageValidation,
  IJsonWebTokenProofHeader,
  IJsonWebTokenProofPayload,
  IResourceValidation,
  IServiceEndpoint,
  ISignedDomainLinkageCredential,
  IVerifierConfig,
  IVerifyCredentialResult,
  IVerifyDomainLinkageArgs,
  IVerifyDomainLinkageCredentialArgs,
  IVerifyEndpointDescriptorArgs,
  IVerifyResourceArgs,
  PromiseStatusEnum,
  ProofFormatTypesEnum,
  ServiceTypesEnum,
  StrictPropertyCheck,
  ValidationStatusEnum,
} from '../types';
import {
  decodeToken,
  fetchWellKnownDidConfiguration,
  verifyResourceStructure
} from '../utils';

export class WellKnownDidVerifier {
  private readonly config?: IVerifierConfig;

  /** Verifier constructor */
  constructor(config?: IVerifierConfig) {
    this.config = config
  }

  /**
   * Verifies the domain linkage from a DID document.
   *
   * @param args The arguments for verifying domain linkage.
   * @return {IDomainLinkageValidation}, The validation result.
   */
  public async verifyDomainLinkage(args: IVerifyDomainLinkageArgs): Promise<IDomainLinkageValidation> {
    if (!args.verifySignatureCallback && (!this.config || !this.config?.verifySignatureCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_VERIFY_SIGNATURE_CALLBACK))
    }

    // DID document should have a service property
    if (!args.didDocument.service) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SERVICE_NOT_PRESENT })

    // Service property should contain 'LinkedDomains' types
    const linkedDomainsEndpointDescriptors: Array<ServiceEndpoint> = args.didDocument.service.filter((service: ServiceEndpoint) => service.type = ServiceTypesEnum.LINKED_DOMAINS)
    if (linkedDomainsEndpointDescriptors.length === 0) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SERVICE_NOT_CONTAIN_ANY_SERVICE_WITH_TYPE+`${ServiceTypesEnum.LINKED_DOMAINS}` })

    const descriptorValidations = linkedDomainsEndpointDescriptors.map((descriptor: ServiceEndpoint) => this.verifyEndpointDescriptor({
      descriptor,
      verifySignatureCallback: args.verifySignatureCallback,
      onlyVerifyServiceDid: args.onlyVerifyServiceDid
    }))

    return await Promise.allSettled(descriptorValidations)
      .then((results: Array<PromiseSettledResult<IDescriptorValidation>>) => {
        return {
          status: results.find((result: PromiseSettledResult<IDescriptorValidation>) =>
              result.status === PromiseStatusEnum.REJECTED || result.value.status === ValidationStatusEnum.INVALID) ? ValidationStatusEnum.INVALID : ValidationStatusEnum.VALID,
          endpointDescriptors: results.map((result: PromiseSettledResult<IDescriptorValidation>) =>
              result.status === PromiseStatusEnum.FULFILLED ? result.value : result.reason)
        }
      });
  }

  /**
   * Verifies the endpoint descriptor.
   *
   * @param args The arguments to verify the descriptor.
   * @return {IDescriptorValidation}, The validation result.
   */
  public async verifyEndpointDescriptor(args: IVerifyEndpointDescriptorArgs): Promise<IDescriptorValidation> {
    if (!args.verifySignatureCallback && (!this.config || !this.config?.verifySignatureCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_VERIFY_SIGNATURE_CALLBACK))
    }

    return this.verifyEndpointDescriptorStructure(args.descriptor).then(async () => {
      const resourceValidations = this.getOrigins(args.descriptor)
        .map((origin: string) => fetchWellKnownDidConfiguration(origin)
          .then((didConfigurationResource: IDidConfigurationResource) =>
              this.verifyResource({
                configuration: didConfigurationResource,
                did: (this.config?.onlyVerifyServiceDid || args.onlyVerifyServiceDid)
                    ? args.descriptor.id
                    : undefined, verifySignatureCallback: args.verifySignatureCallback
              }))
      )

      return await Promise.allSettled(resourceValidations)
        .then((results: Array<PromiseSettledResult<IResourceValidation>>) => {
          return {
            status: results.find((result: PromiseSettledResult<IResourceValidation>) =>
                result.status === PromiseStatusEnum.REJECTED || result.value.status === ValidationStatusEnum.INVALID) ? ValidationStatusEnum.INVALID : ValidationStatusEnum.VALID,
            resources: results.map((result: PromiseSettledResult<IResourceValidation>) =>
                result.status === PromiseStatusEnum.FULFILLED ? result.value : result.reason)
          }
        });
    })
  }

  /**
   * Verifies the DID configuration resource.
   *
   * @param args The arguments to verify the resource.
   * @return {IResourceValidation}, The validation result.
   */
  public async verifyResource<T extends IVerifyResourceArgs>(args: T & StrictPropertyCheck<T, IVerifyResourceArgs, 'Only allowed properties of IVerifyResourceArgs'>): Promise<IResourceValidation> {
    if (!args.verifySignatureCallback && (!this.config || !this.config?.verifySignatureCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_VERIFY_SIGNATURE_CALLBACK))
    }

    if (args.configuration && args.origin) {
      return Promise.reject(Error(WDCErrors.CANT_SUPPLY_BOTH_CONFIGURATION_AND_ORIGIN))
    }

    if (!args.configuration && !args.origin) {
      return Promise.reject(Error(WDCErrors.NO_DID_CONFIGURATION_RESOURCE_OR_ORIGIN_SUPPLIED))
    }

    let did: string;
    if (args.did) {
      did = parseDid(args.did).did
    }

    if (args.origin) {
      if (new URL(args.origin).protocol !== 'https:') return Promise.reject(WDCErrors.ORIGIN_NOT_SECURE)
    }

    const didConfigurationResource: IDidConfigurationResource = args.configuration
        // @ts-ignore: We know for sure the config is present
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        ? await verifyResourceStructure(args.configuration).then(() => args.configuration!)
        // @ts-ignore: We know for sure the origin is present
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        : await fetchWellKnownDidConfiguration(args.origin!)


    const credentialValidations = didConfigurationResource.linked_dids
      .filter((item: ISignedDomainLinkageCredential | string) => {
        if (!did) return true
        let credential: ISignedDomainLinkageCredential | Omit<ISignedDomainLinkageCredential, 'proof'>
        if (typeof item === 'string') {
          try {
            credential = (decodeToken(item, false) as IJsonWebTokenProofPayload).vc
          } catch (error: unknown) {
            return true
          }
        } else {
          credential = item
        }

        return credential.credentialSubject.id === did
      })
      .map((credential: ISignedDomainLinkageCredential | string) => this.verifyDomainLinkageCredential({ credential, verifySignatureCallback: args.verifySignatureCallback }))

    if (credentialValidations.length === 0) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.NO_CREDENTIALS_FOUND_FOR_DID+`${args.did}`})

    return Promise.allSettled(credentialValidations)
    .then((results: Array<PromiseSettledResult<ICredentialValidation | undefined>>) => {
      return {
        status: results.find((result: PromiseSettledResult<ICredentialValidation | undefined>) =>
            result.status === PromiseStatusEnum.REJECTED) ? ValidationStatusEnum.INVALID : ValidationStatusEnum.VALID,
        credentials: results.map((result: PromiseSettledResult<ICredentialValidation | undefined>) =>
            result.status === PromiseStatusEnum.FULFILLED ? result.value : result.reason)
      }
    });
  }

  /**
   * Verifies the domain linkage credential.
   *
   * @param args The domain linkage credential. Types can be JWT or JSONLD.
   * @return {ICredentialValidation}, The validation result.
   */
  public async verifyDomainLinkageCredential(args: IVerifyDomainLinkageCredentialArgs): Promise<ICredentialValidation> {
    if (!args.verifySignatureCallback && (!this.config || !this.config?.verifySignatureCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_VERIFY_SIGNATURE_CALLBACK))
    }

    if (typeof args.credential === 'string') {
      return this.verifyJsonWebTokenProofFormat(args.credential)
        .then(() => this.verifyDomainLinkageCredentialStructure((decodeToken(args.credential as string, false) as IJsonWebTokenProofPayload).vc))
        .then(() => args.verifySignatureCallback
            ? args.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN })
            // @ts-ignore: We know for sure the config is present
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
            : this.config!.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_WEB_TOKEN }))
        .then((verificationResult: IVerifyCredentialResult) => {
          if (!verificationResult.verified) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.SIGNATURE_IS_INVALID})

          return { status: ValidationStatusEnum.VALID }
        })
    }

    return this.verifyDomainLinkageCredentialStructure(args.credential as ISignedDomainLinkageCredential)
      .then(() => args.verifySignatureCallback
          ? args.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_LD })
          // @ts-ignore: We know for sure the config is present
          // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
          : this.config!.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_LD }))
      .then((verificationResult: IVerifyCredentialResult) => {
        if (!verificationResult.verified) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.SIGNATURE_IS_INVALID})

        return { status: ValidationStatusEnum.VALID }
      })
  }

  /**
   * Verifies the endpoint descriptor object structure.
   *
   * @param descriptor The endpoint descriptor.
   */
  private async verifyEndpointDescriptorStructure(descriptor: ServiceEndpoint): Promise<void> {
    // The object MUST contain an id property
    if (!descriptor.id)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ID_NOT_PRESENT_IN_SERVICE})
    // The object id property value MUST be a valid DID URL reference

    try {
      parseDid(descriptor.id)
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ID_NOT_VALID_DID_URL })
    }

    // The object MUST contain a type property
    if (!descriptor.type)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_TYPE_NOT_PRESENT_IN_SERVICE })
    // The object type property value MUST be the string "LinkedDomains".
    if (descriptor.type !== ServiceTypesEnum.LINKED_DOMAINS)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_TYPE_NOT_CONTAIN_VALID_LINKED_DOMAIN })

    // The object MUST contain a serviceEndpoint property
    if (!descriptor.serviceEndpoint)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SERVICE_ENDPOINT_NOT_PRESENT_IN_SERVICE })

     // The object serviceEndpoint property can be a string and the value MUST be an origin string
    if (new URL(descriptor.serviceEndpoint).origin !== descriptor.serviceEndpoint)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SERVICE_ENDPOINT_NOT_CONTAIN_VALID_ORIGIN})
    if (new URL(descriptor.serviceEndpoint).protocol !== 'https:') return Promise.reject({
      status: ValidationStatusEnum.INVALID,
      message: WDCErrors.PROPERTY_ORIGIN_NOT_SECURE
    })

    if (typeof descriptor.serviceEndpoint === 'object') {
      // The object serviceEndpoint property can be an object which MUST contain an origins property
      if (!Object.prototype.hasOwnProperty.call(descriptor.serviceEndpoint, 'origins'))
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SERVICE_ENDPOINT_NOT_CONTAIN_ORIGIN })

      // The object serviceEndpoint property should have origins
      if ((descriptor.serviceEndpoint as IServiceEndpoint).origins.length === 0)
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ORIGIN_NOT_CONTAIN_ANY_ORIGIN })

      // The origins should be valid
      for (const origin of (descriptor.serviceEndpoint as IServiceEndpoint).origins) {
        if (new URL(origin).origin !== origin)
          return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ORIGIN_CONTAIN_INVALID_ORIGIN })

        if (new URL(origin).protocol !== 'https:') return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ORIGIN_NOT_SECURE })
      }
    }
  }

  /**
   * Verifies the structure of a JWT domain linkage credential.
   *
   * @param token The JWT token.
   */
  private async verifyJsonWebTokenProofFormat(token: string): Promise<void> {
    await this.verifyJsonWebTokenProofHeaderStructure(decodeToken(token, true) as IJsonWebTokenProofHeader)
    await this.verifyJsonWebTokenProofPayloadStructure(decodeToken(token, false) as IJsonWebTokenProofPayload)
  }

  /**
   * Verifies the structure of a JWT domain linkage credential header.
   *
   * @param header The JWT header.
   */
  private async verifyJsonWebTokenProofHeaderStructure<T extends IJsonWebTokenProofHeader>(header: T & StrictPropertyCheck<T, IJsonWebTokenProofHeader, 'Only allowed properties of IJsonWebTokenProofHeader'>): Promise<void> {
    // Property kid MUST be present in the JWT Header
    if (!header.kid)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_KID_NOT_PRESENT_IN_JWT_HEADER})

    // Property alg MUST be present in the JWT Header
    if (!header.alg)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ALG_NOT_PRESENT_IN_JWT_HEADER})

    // Additional members MUST NOT be present in the header
    if (Object.getOwnPropertyNames(header).filter(property => !['kid', 'alg'].includes(property)).length > 0)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.JWT_HEADER_CONTAINS_ADDITIONAL_PROPS })
  }

  /**
   * Verifies the structure of a JWT domain linkage credential payload.
   *
   * @param payload The JWT payload.
   */
  private async verifyJsonWebTokenProofPayloadStructure<T extends IJsonWebTokenProofPayload>(payload: T & StrictPropertyCheck<T, IJsonWebTokenProofPayload, 'Only allowed properties of IJsonWebTokenProofPayload'>): Promise<void> {
    // Property iss MUST be present in the JWT Payload
    if (!payload.iss)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ISS_NOT_PRESENT_IN_JWT_PAYLOAD})

    // Property sub MUST be present in the JWT Payload
    if (!payload.sub)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SUB_NOT_PRESENT_IN_JWT_PAYLOAD})

    // Property vc MUST be present in the JWT Payload
    if (!payload.vc)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_VC_NOT_PRESENT_IN_JWT_PAYLOAD})

    // Property iss MUST be equal to credentialSubject.id.
    if (payload.vc.credentialSubject && payload.vc.credentialSubject.id !== payload.iss)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ISS_NOT_MATCH_CREDENTIAL_SUBJECT_ID_IN_JWT_PAYLOAD})

    // Property sub MUST be equal to credentialSubject.id.
    if (payload.vc.credentialSubject && payload.vc.credentialSubject.id !== payload.sub)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_SUB_NOT_MATCH_CREDENTIAL_SUBJECT_ID_IN_JWT_PAYLOAD})

    // Additional members MUST NOT be present in the payload
    if (Object.getOwnPropertyNames(payload).filter(property => !['exp', 'iss', 'nbf', 'sub', 'vc'].includes(property)).length > 0)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.JWT_PAYLOAD_CONTAINS_ADDITIONAL_PROPS })
  }

  /**
   * Verifies the structure of a domain linkage credential.
   *
   * @param credential The domain linkage credential.
   */
  private async verifyDomainLinkageCredentialStructure(credential: ISignedDomainLinkageCredential | Omit<ISignedDomainLinkageCredential, 'proof'>): Promise<void> {
    // Property issuanceDate MUST be present.
    if (!credential.issuanceDate) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ISSUANCE_DATE_NOT_PRESENT_IN_CREDENTIAL })

    // Property issuanceDate MUST be a valid date.
    if (/*typeof credential.issuanceDate === 'string' && */isNaN(Date.parse(credential.issuanceDate)))
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_ISSUANCE_DATE_NOT_VALID })

    // Property expirationDate MUST be present.
    if (!credential.expirationDate) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_EXPIRATION_DATE_NOT_PRESENT_IN_CREDENTIAL })

    // Property expirationDate MUST be a valid date.
    if (/*typeof credential.expirationDate === 'string' && */isNaN(Date.parse(credential.expirationDate)))
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_EXPIRATION_DATE_NOT_VALID })

    // Property credentialSubject MUST be present.
    if (!credential.credentialSubject)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_NOT_PRESENT_IN_CREDENTIAL })

    // Property credentialSubject.id MUST be present.
    if (!credential.credentialSubject.id)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ID_NOT_PRESENT_IN_CREDENTIAL})

    // Property credentialSubject.id MUST be a DID.
    try {
      parseDid(credential.credentialSubject.id)
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ID_NOT_VALID_DID })
    }

    // The credentialSubject.id value MUST be equal to the issuer of the Domain Linkage Credential.
    if (credential.issuer && credential.credentialSubject.id !== credential.issuer)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ID_NOT_MATCH_ISSUER })

    // Property credentialSubject.origin MUST be present.
    if (!credential.credentialSubject.origin)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ORIGIN_NOT_PRESENT_IN_CREDENTIAL})

    // Property credentialSubject.origin MUST be a domain Origin.
    try {
      if (new URL(credential.credentialSubject.origin).origin !== credential.credentialSubject.origin)
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ORIGIN_NOT_VALID })
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CREDENTIAL_SUBJECT_ORIGIN_NOT_VALID })
    }

  }

  /**
   * Retrieves the origins of an endpoint descriptor.
   *
   * @param descriptor The endpoint descriptor.
   */
  private getOrigins(descriptor: ServiceEndpoint): Array<string> {
    return [descriptor.serviceEndpoint]
  }

}

