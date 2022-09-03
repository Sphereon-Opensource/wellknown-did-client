import { parseDid } from '@sphereon/ssi-types';

import { CONTEXT_URLS, WDCErrors } from '../constants';
import {
  DomainLinkageCredential,
  IDidConfigurationResource,
  IDomainLinkageCredential,
  IIssueDidConfigurationResourceArgs,
  IIssueDomainLinkageCredentialArgs,
  IIssuerConfig
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
      return Promise.reject(Error(WDCErrors.CANT_SUPPLY_BOTH_CONFIGURATION_AND_ORIGIN))
    }

    if (!args.issueCallback && (!this.config || !this.config?.issueCallback) && args.issuances.some(issuance => !issuance.issueCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_ISSUE_CALLBACK))
    }

    if (args.origin && args.issuances.filter(issuance => issuance.origin !== args.origin).length > 0) {
      return Promise.reject(Error(WDCErrors.ISSUANCE_ORIGIN_DOES_NOT_MATCH_PROVIDED_ORIGIN))
    }

    let didConfigurationResource: IDidConfigurationResource;
    if (args.configuration) {
      didConfigurationResource = args.configuration
    } else if (args.origin) {
      didConfigurationResource = await fetchWellKnownDidConfiguration(args.origin)
    } else {
      didConfigurationResource = {
        '@context': CONTEXT_URLS.IDENTITY_FOUNDATION_WELL_KNOWN_DID,
        'linked_dids': new Array<DomainLinkageCredential>()
      }
    }

    const credentials: Array<DomainLinkageCredential> = await Promise.all(
        args.issuances.map((item: IIssueDomainLinkageCredentialArgs) => {
          const issuance = (!item.issueCallback ? { ...item, issueCallback: args.issueCallback } : item )
          return this.issueDomainLinkageCredential(issuance)
        })
    )
    didConfigurationResource.linked_dids = didConfigurationResource.linked_dids.concat(credentials)

    return didConfigurationResource
  }

  /**
   * Issue a domain linkage credential.
   * Return types can be of Linked Data Proof Format or JSON Web Token Proof Format.
   *
   * @param args The arguments for issuance.
   * @return {DomainLinkageCredential}, issuance result.
   */
  public async issueDomainLinkageCredential(args: IIssueDomainLinkageCredentialArgs): Promise<DomainLinkageCredential> {
    if (!args.issueCallback && (!this.config || !this.config?.issueCallback)) {
      return Promise.reject(Error(WDCErrors.MUST_SUPPLY_ISSUE_CALLBACK))
    }

    const did: string = parseDid(args.did).did

    if (new URL(args.origin).origin !== args.origin) {
      return Promise.reject(Error(WDCErrors.ORIGIN_NOT_VALID))
    }

    if (args.issuanceDate && isNaN(Date.parse(args.issuanceDate))) {
      return Promise.reject(Error(WDCErrors.PROPERTY_ISSUANCE_DATE_NOT_VALID))
    }

    if (isNaN(Date.parse(args.expirationDate))) {
      return Promise.reject(Error(WDCErrors.PROPERTY_EXPIRATION_DATE_NOT_VALID))
    }

    const credential: IDomainLinkageCredential = {
      "@context": [
        CONTEXT_URLS.W3C_CREDENTIALS_V1,
        CONTEXT_URLS.IDENTITY_FOUNDATION_WELL_KNOWN_DID
      ],
      "issuer": did,
      "issuanceDate": args.issuanceDate || new Date().toISOString(),
      "expirationDate": args.expirationDate,
      "type": [
        "VerifiableCredential",
        "DomainLinkageCredential"
      ],
      "credentialSubject": {
        "id": did,
        "origin": args.origin
      },
    }

    return (args.issueCallback)
        ? await args.issueCallback({ credential, proofFormat: args.options.proofFormat })
        // @ts-ignore: We know for sure the config is present
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        : await this.config!.issueCallback({ credential, proofFormat: args.options.proofFormat })
  }

}
