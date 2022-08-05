import { parseDid } from '@sphereon/ssi-sdk-core';

import { CONTEXT_URLS } from '../constants';
import {
  IDidConfigurationResource,
  IDomainLinkageCredential,
  IIssueDidConfigurationResourceArgs,
  IIssueDomainLinkageCredentialArgs,
  IIssuerConfig,
  ISignedDomainLinkageCredential,
} from '../types';
import { fetchWellKnownDidConfiguration } from '../utils';

export class WellKnownDidIssuer {
  private readonly config?: IIssuerConfig;

  /** Issuer constructor */
  constructor(config?: IIssuerConfig) {
    this.config = config
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

    if (!args.issueCallback && (!this.config || !this.config?.issueCallback)) {
      return Promise.reject(Error('issueCallback needs to be supplied via parameter or config'))
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
    if (!args.issueCallback && (!this.config || !this.config?.issueCallback)) {
      return Promise.reject(Error('issueCallback needs to be supplied via parameter or config'))
    }

    parseDid(args.did)

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
      "issuer": args.did,
      "issuanceDate": args.issuanceDate || new Date().toISOString(),
      "expirationDate": args.expirationDate,
      "type": [
        "VerifiableCredential",
        "DomainLinkageCredential"
      ],
      "credentialSubject": {
        "id": args.did,
        "origin": args.origin
      },
    }

    return (args.issueCallback)
        ? await args.issueCallback({ credential, proofFormat: args.options.proofFormat })
        : await this.config!.issueCallback({ credential, proofFormat: args.options.proofFormat })
  }

}
