import { parseDid } from '@sphereon/ssi-sdk-core';

import { CONTEXT_URLS } from '../constants';
import {
  IDidConfigurationResource,
  IDomainLinkageCredential,
  IIssueCallbackArgs,
  IIssueDidConfigurationResourceArgs,
  IIssueDomainLinkageCredentialArgs,
  IIssuerConfig,
  ISignedDomainLinkageCredential,
} from '../types';
import { fetchWellKnownDidConfiguration } from '../utils';

export class DomainLinkageIssuer {
  private readonly config: IIssuerConfig;

  /** Issuer constructor */
  constructor(config: IIssuerConfig) {
    this.config = config
  }

  /**
   * Sets the issue credential callback for the issuer.
   *
   * @param callback The issue credential callback for the issuer.
   * @return this.
   */
  public setIssueCallback(callback: (args: IIssueCallbackArgs) => Promise<ISignedDomainLinkageCredential | string>): this {
    this.config.issueCallback = callback

    return this;
  }

  /**
   * Issue a DID configuration resource.
   *
   * @param args The arguments for issuance.
   * @return {IDidConfigurationResource}, issuance result.
   */
  public async issueDidConfigurationResource(args: IIssueDidConfigurationResourceArgs): Promise<IDidConfigurationResource> {
    if (args.configuration && args.origin) {
      return Promise.reject(Error('Cannot supply both a configuration and an origin. Only one should be supplied at the same time.'))
    }

    let didConfigurationResource: IDidConfigurationResource;
    if (args.configuration) {
      didConfigurationResource = args.configuration
    } else if (args.origin) {
      didConfigurationResource = await fetchWellKnownDidConfiguration(args.origin)
    } else {
      didConfigurationResource = {
        '@context': CONTEXT_URLS.IDENTITY_FOUNDATION_WELL_KNOWN_DID,
        'linked_dids': new Array<ISignedDomainLinkageCredential | string>()
      }
    }

    const credentials: Array<ISignedDomainLinkageCredential | string> = await Promise.all(args.issuances.map((issuance: IIssueDomainLinkageCredentialArgs) =>
        this.issueDomainLinkageCredential(issuance))
    )
    didConfigurationResource.linked_dids = didConfigurationResource.linked_dids.concat(credentials)

    return didConfigurationResource
  }

  /**
   * Issue a domain linkage credential.
   * Return types can be of Linked Data Proof Format or JSON Web Token Proof Format.
   *
   * @param args The arguments for issuance.
   * @return {ILinkedDataDomainLinkageCredential | string}, issuance result.
   */
  public async issueDomainLinkageCredential(args: IIssueDomainLinkageCredentialArgs): Promise<ISignedDomainLinkageCredential | string> {
    try {
      parseDid(args.didUrl)
    } catch (error: unknown) {
      return Promise.reject(Error('didUrl is not a valid did'))
    }

    if (new URL(args.origin).origin !== args.origin) {
      return Promise.reject(Error('origin is not a valid origin'))
    }

    if (args.issuanceDate && typeof args.issuanceDate === 'string' && isNaN(Date.parse(args.issuanceDate))) {
      return Promise.reject(Error('issuanceDate is not a valid date'))
    }

    if (typeof args.expirationDate === 'string' && isNaN(Date.parse(args.expirationDate))) {
      return Promise.reject(Error('expirationDate is not a valid date'))
    }

    const credential: IDomainLinkageCredential = {
      "@context": [
        CONTEXT_URLS.W3C_CREDENTIALS_V1,
        CONTEXT_URLS.IDENTITY_FOUNDATION_WELL_KNOWN_DID
      ],
      "issuer": args.didUrl,
      "issuanceDate": args.issuanceDate || new Date().toISOString(),
      "expirationDate": args.expirationDate,
      "type": [
        "VerifiableCredential",
        "DomainLinkageCredential"
      ],
      "credentialSubject": {
        "id": args.didUrl,
        "origin": args.origin
      },
    }

    return await this.config.issueCallback({ credential, proofFormat: args.options.proofFormat })
  }

}
