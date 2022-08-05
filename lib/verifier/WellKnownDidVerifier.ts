import { IParsedDID, parseDid } from '@sphereon/ssi-sdk-core';
import { Service } from 'did-resolver/lib/resolver';

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
import { decodeToken, fetchWellKnownDidConfiguration } from '../utils';

export class WellKnownDidVerifier {
  private readonly config: IVerifierConfig;

  /** Verifier constructor */
  constructor(config: IVerifierConfig) {
    this.config = config
  }

  /**
   * Verifies the domain linkage from a DID document.
   *
   * @param args The arguments for verifying domain linkage.
   * @return {IDomainLinkageValidation}, The validation result.
   */
  public async verifyDomainLinkage(args: IVerifyDomainLinkageArgs): Promise<IDomainLinkageValidation> {
    // DID document should have a service property
    if (!args.didDocument.service) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property service is not present in the provided DID document' })

    // Service property should contain 'LinkedDomains' types
    const linkedDomainsEndpointDescriptors: Array<Service> = args.didDocument.service.filter((service: Service) => service.type = ServiceTypesEnum.LINKED_DOMAINS)
    if (linkedDomainsEndpointDescriptors.length === 0) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: `Property service does not contain any services with type: ${ServiceTypesEnum.LINKED_DOMAINS}` })

    const descriptorValidations = linkedDomainsEndpointDescriptors.map((descriptor: Service) => this.verifyEndpointDescriptor({
      descriptor,
      verifySignatureCallback: args.verifySignatureCallback,
      onlyValidateServiceDid: args.onlyValidateServiceDid
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
    return this.verifyEndpointDescriptorStructure(args.descriptor).then(async () => {
      const resourceValidations = this.getOrigins(args.descriptor)
        .map((origin: string) => fetchWellKnownDidConfiguration(origin)
          .catch((error: Error) => Promise.reject({ status: ValidationStatusEnum.INVALID, message: error.message}))
          .then((didConfigurationResource: IDidConfigurationResource) => this.verifyResource({ configuration: didConfigurationResource, did: (this.config.onlyValidateServiceDid || args.onlyValidateServiceDid) ? args.descriptor.id : undefined, verifySignatureCallback: args.verifySignatureCallback }))
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
    if (args.configuration && args.origin) {
      return Promise.reject(Error('Cannot supply both a configuration and an origin. Only one should be supplied at the same time.'))
    }

    if (!args.configuration && !args.origin) {
      return Promise.reject(Error('No did configuration resource or origin supplied . Supply a configuration or an secure well-known location'))
    }

    let parsedDID: IParsedDID;
    if (args.did) {
      try {
        parsedDID = parseDid(args.did)
      } catch (error: unknown) {
        return Promise.reject(Error('did is not a valid did'))
      }
    }

    if (args.origin) {
      if (new URL(args.origin).protocol !== 'https:') return Promise.reject('origin is not secure')
    }

    const didConfigurationResource: IDidConfigurationResource = (args.configuration)
        ? args.configuration
        : await fetchWellKnownDidConfiguration(args.origin!)

    return this.verifyResourceStructure(didConfigurationResource)
      .then(() => {
        const credentialValidations = didConfigurationResource.linked_dids
          .filter((item: ISignedDomainLinkageCredential | string) => {
            if (!parsedDID) return true
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

            return credential.credentialSubject.id === parsedDID.did
          })
          .map((credential: ISignedDomainLinkageCredential | string) => this.verifyDomainLinkageCredential({ credential, verifySignatureCallback: args.verifySignatureCallback }))

        if (credentialValidations.length === 0) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: `No credentials found for DID: ${args.did}`})

        return Promise.allSettled(credentialValidations)
          .then((results: Array<PromiseSettledResult<ICredentialValidation | undefined>>) => {
            return {
              status: results.find((result: PromiseSettledResult<ICredentialValidation | undefined>) =>
                  result.status === PromiseStatusEnum.REJECTED) ? ValidationStatusEnum.INVALID : ValidationStatusEnum.VALID,
              credentials: results.map((result: PromiseSettledResult<ICredentialValidation | undefined>) =>
                  result.status === PromiseStatusEnum.FULFILLED ? result.value : result.reason)
        }
      });
    })
  }

  /**
   * Verifies the domain linkage credential.
   *
   * @param credential The domain linkage credential. Types can be JWT or JSONLD.
   * @return {ICredentialValidation}, The validation result.
   */
  public async verifyDomainLinkageCredential(args: IVerifyDomainLinkageCredentialArgs): Promise<ICredentialValidation> {
    if (typeof args.credential === 'string') {
      return this.verifyJsonWebTokenProofFormat(args.credential)
        .then(() => this.verifyDomainLinkageCredentialStructure((decodeToken(args.credential as string, false) as IJsonWebTokenProofPayload).vc))
        .then(() => (args.verifySignatureCallback)
            ? args.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_LD })
            : this.config.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_LD }))
        .then((verificationResult: IVerifyCredentialResult) => {
          if (!verificationResult.verified) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Signature is invalid'})

          return { status: ValidationStatusEnum.VALID }
        })
    }

    return this.verifyDomainLinkageCredentialStructure(args.credential as ISignedDomainLinkageCredential)
      .then(() => this.config.verifySignatureCallback({ credential: args.credential, proofFormat: ProofFormatTypesEnum.JSON_LD }))
      .then((verificationResult: IVerifyCredentialResult) => {
        if (!verificationResult.verified) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Signature is invalid'})

        return { status: ValidationStatusEnum.VALID }
      })
  }

  /**
   * Verifies the endpoint descriptor object structure.
   *
   * @param descriptor The endpoint descriptor.
   */
  private async verifyEndpointDescriptorStructure(descriptor: Service): Promise<void> {
    // The object MUST contain an id property
    if (!descriptor.id)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property id is not present in the service' })
    // The object id property value MUST be a valid DID URL reference

    try {
      parseDid(descriptor.id)
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property id is not a valid did url' })
    }

    // The object MUST contain a type property
    if (!descriptor.type)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property type is not present in the service' })
    // The object type property value MUST be the string "LinkedDomains".
    if (descriptor.type !== ServiceTypesEnum.LINKED_DOMAINS)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property type does not contain a valid value of LinkedDomains' })

    // The object MUST contain a serviceEndpoint property
    if (!descriptor.serviceEndpoint)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property serviceEndpoint is not present in the service' })

    if (typeof descriptor.serviceEndpoint === 'string') {
      // The object serviceEndpoint property can be a string and the value MUST be an origin string
      if (new URL(descriptor.serviceEndpoint).origin !== descriptor.serviceEndpoint)
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property serviceEndpoint does not contain a valid origin' })

      if (new URL(descriptor.serviceEndpoint).protocol !== 'https:') return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property origin is not secure' })
    }

    if (typeof descriptor.serviceEndpoint === 'object') {
      // The object serviceEndpoint property can be an object which MUST contain an origins property
      if (!descriptor.serviceEndpoint.hasOwnProperty('origins'))
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property serviceEndpoint does not contain an origins field' })

      // The object serviceEndpoint property should have origins
      if ((descriptor.serviceEndpoint as IServiceEndpoint).origins.length === 0)
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property origins does not contain any origins' })

      // The origins should be valid
      for (const origin of (descriptor.serviceEndpoint as IServiceEndpoint).origins) {
        if (new URL(origin).origin !== origin)
          return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property origins contains an invalid origins' })

        if (new URL(origin).protocol !== 'https:') return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property origin is not secure' })
      }
    }
  }

  /**
   * Verifies the DID configuration resource object structure.
   *
   * @param resource The DID configuration resource.
   */
  private async verifyResourceStructure(resource: IDidConfigurationResource): Promise<void> {
    // @context MUST be present.
    if (!resource['@context']) return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'Property @context is not present' })

    // linked_dids MUST be present.
    if (!resource.linked_dids) return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'Property linked_dids is not present' })

    // The value of linked_dids MUST be an array of DomainLinkageCredential entries.
    if (resource.linked_dids.length === 0) return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'Property linked_dids does not contain any domain linkage credentials' })

    // Additional members MUST NOT be present in the header
    if (Object.getOwnPropertyNames(resource).filter(property => !['@context', 'linked_dids'].includes(property)).length > 0)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'Resource contains additional properties' })
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
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property kid is not present in JWT header'})

    // Property alg MUST be present in the JWT Header
    if (!header.alg)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property alg is not present in JWT header'})

    // Additional members MUST NOT be present in the header
    if (Object.getOwnPropertyNames(header).filter(property => !['kid', 'alg'].includes(property)).length > 0)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'JWT header contains additional properties' })
  }

  /**
   * Verifies the structure of a JWT domain linkage credential payload.
   *
   * @param payload The JWT payload.
   */
  private async verifyJsonWebTokenProofPayloadStructure<T extends IJsonWebTokenProofPayload>(payload: T & StrictPropertyCheck<T, IJsonWebTokenProofPayload, 'Only allowed properties of IJsonWebTokenProofPayload'>): Promise<void> {
    // Property iss MUST be present in the JWT Payload
    if (!payload.iss)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property iss is not present in JWT payload'})

    // Property sub MUST be present in the JWT Payload
    if (!payload.sub)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property sub is not present in JWT payload'})

    // Property vc MUST be present in the JWT Payload
    if (!payload.vc)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property vc is not present in JWT payload'})

    // Property iss MUST be equal to credentialSubject.id.
    if (payload.vc.credentialSubject && payload.vc.credentialSubject.id !== payload.iss)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property iss does not match credentialSubject id in JWT payload'})

    // Property sub MUST be equal to credentialSubject.id.
    if (payload.vc.credentialSubject && payload.vc.credentialSubject.id !== payload.sub)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property sub does not match credentialSubject id in JWT payload'})

    // Additional members MUST NOT be present in the payload
    if (Object.getOwnPropertyNames(payload).filter(property => !['exp', 'iss', 'nbf', 'sub', 'vc'].includes(property)).length > 0)
      return Promise.reject({status: ValidationStatusEnum.INVALID, message: 'JWT payload contains additional properties' })
  }

  /**
   * Verifies the structure of a domain linkage credential.
   *
   * @param credential The domain linkage credential.
   */
  private async verifyDomainLinkageCredentialStructure(credential: ISignedDomainLinkageCredential | Omit<ISignedDomainLinkageCredential, 'proof'>): Promise<void> {
    // Property issuanceDate MUST be present.
    if (!credential.issuanceDate) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property issuanceDate is not present within the credential' })

    // Property issuanceDate MUST be a valid date.
    if (typeof credential.issuanceDate === 'string' && isNaN(Date.parse(credential.issuanceDate)))
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property issuanceDate is not a valid date' })

    // Property expirationDate MUST be present.
    if (!credential.expirationDate) return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property expirationDate is not present within the credential' })

    // Property expirationDate MUST be a valid date.
    if (typeof credential.expirationDate === 'string' && isNaN(Date.parse(credential.expirationDate)))
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property expirationDate is not a valid date' })

    // Property credentialSubject MUST be present.
    if (!credential.credentialSubject)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject is not present within the credential' })

    // Property credentialSubject.id MUST be present.
    if (!credential.credentialSubject.id)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.id is not present within the credential'})

    // Property credentialSubject.id MUST be a DID.
    try {
      parseDid(credential.credentialSubject.id)
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.id is not a valid did url' })
    }

    // The credentialSubject.id value MUST be equal to the issuer of the Domain Linkage Credential.
    if (credential.issuer && credential.credentialSubject.id !== credential.issuer)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.id does not match issuer property' })

    // The credentialSubject.id value MUST be equal to the subject of the Domain Linkage Credential.
    if (credential.subject && credential.credentialSubject.id !== credential.subject)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.id does not match subject property' })

    // Property credentialSubject.origin MUST be present.
    if (!credential.credentialSubject.origin)
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: 'Property credentialSubject.origin is not present within the credential'})

    // Property credentialSubject.origin MUST be a domain Origin.
    try {
      if (new URL(credential.credentialSubject.origin).origin !== credential.credentialSubject.origin)
        return Promise.reject({ status: ValidationStatusEnum.INVALID, message: `Property credentialSubject.origin is not a valid origin` })
    } catch (error: unknown) {
      return Promise.reject({ status: ValidationStatusEnum.INVALID, message: `Property credentialSubject.origin is not a valid origin` })
    }

  }

  /**
   * Retrieves the origins of an endpoint descriptor.
   *
   * @param descriptor The endpoint descriptor.
   */
  private getOrigins(descriptor: Service): Array<string> {
    if (typeof descriptor.serviceEndpoint === 'string') {
      return [descriptor.serviceEndpoint]
    }

    if (typeof descriptor.serviceEndpoint === 'object') {
      if (descriptor.serviceEndpoint.hasOwnProperty('origins')) {
        return (descriptor.serviceEndpoint as IServiceEndpoint).origins
      }

    }

    return []
  }

}

