export interface IIssuerConfig {
  issueCallback: (args: IIssueCallbackArgs) => Promise<ISignedDomainLinkageCredential | string>
}

export interface IDomainLinkageCredential {
  '@context'?: string[]
  issuer: string
  subject?: string
  credentialSubject: ICredentialSubject
  type?: string[]
  issuanceDate: string | Date
  expirationDate: string | Date
}

export interface CredentialProof {
  type: string
  created: string
  proofPurpose: string
  verificationMethod: string
  challenge?: string
  domain?: string
  proofValue?: string
  jws?: string
  nonce?: string
  requiredRevealStatements?: string[]
  [x: string]: string | string[] | undefined
}

export interface ISignedDomainLinkageCredential extends IDomainLinkageCredential {
  proof: CredentialProof
}

export interface ICredentialSubject {
  id: string
  origin: string
}

export interface IIssueDidConfigurationResourceArgs {
  issuances: Array<IIssueDomainLinkageCredentialArgs>
  configuration?: IDidConfigurationResource
  origin?: string
}

export interface IIssueDomainLinkageCredentialArgs {
  didUrl: string
  origin: string
  issuanceDate?: Date | string
  expirationDate: Date | string
  options: IIssueDomainLinkageCredentialOptions
}

export enum ProofFormatTypesEnum {
  JSON_WEB_TOKEN = 'jwt',
  JSON_LD = 'jsonld'
}

export interface IIssueCallbackArgs {
  credential: IDomainLinkageCredential
  proofFormat?: ProofFormatTypesEnum
}

export interface IIssueDomainLinkageCredentialOptions {
  proofFormat?: ProofFormatTypesEnum
}

export interface IDidConfigurationResource {
  '@context': string
  linked_dids: Array<ISignedDomainLinkageCredential | string>
}

export interface IVerifierConfig {
  verifySignatureCallback: (args: IVerifyCallbackArgs) => Promise<IVerifyCredentialResult>
  onlyValidateServiceDid?: boolean
}

export type IDidDocument = {
  '@context'?: 'https://www.w3.org/ns/did/v1' | string | Array<string>
  id: string
  alsoKnownAs?: Array<string>
  controller?: string | Array<string>
  verificationMethod?: VerificationMethod[]
  service: Array<ILinkedDomainsEndpointDescriptor>
} & {
  [x in KeyCapabilitySection]?: (string | VerificationMethod)[]
}

export interface ILinkedDomainsEndpointDescriptor {
  id: string
  type: ServiceTypesEnum.LINKED_DOMAINS
  serviceEndpoint: IServiceEndpoint | string
}

export interface IServiceEndpoint {
  origins: Array<string>
}

export type KeyCapabilitySection =
    | 'authentication'
    | 'assertionMethod'
    | 'keyAgreement'
    | 'capabilityInvocation'
    | 'capabilityDelegation'

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyBase58?: string
  publicKeyBase64?: string
  publicKeyJwk?: JsonWebKey
  publicKeyHex?: string
  publicKeyMultibase?: string
  blockchainAccountId?: string
  ethereumAddress?: string
}

export interface JsonWebKey extends Record<string, unknown> {
  alg?: string
  crv?: string
  e?: string
  ext?: boolean
  key_ops?: string[]
  kid?: string
  kty: string
  n?: string
  use?: string
  x?: string
  y?: string
}

export interface IJsonWebTokenProofHeader {
  kid: string;
  alg: string;
}

export interface IJsonWebTokenProofPayload {
  exp : number;
  iss: string;
  nbf : number;
  sub : string;
  vc : Omit<ISignedDomainLinkageCredential, 'proof'>;
}

export interface IVerifyCredentialResult {
  verified: boolean
}

export interface IVerifyCallbackArgs {
  credential: ISignedDomainLinkageCredential | string
  proofFormat?: ProofFormatTypesEnum
}

export interface IVerifyDomainLinkageArgs {
  didDocument: IDidDocument
}

export interface IVerifyEndpointDescriptorArgs {
  descriptor: ILinkedDomainsEndpointDescriptor
}

export interface IVerifyResourceArgs {
  resource: IDidConfigurationResource | string,
  didUrl?: string
}

export interface IVerifyDomainLinkageCredentialArgs {
  credential: ISignedDomainLinkageCredential | string
}

export type StrictPropertyCheck<T, TExpected, TError> = Exclude<keyof T, keyof TExpected> extends never ? {} : TError;

export interface ICredentialValidation {
  status: ValidationStatusEnum;
  message?: string;
}

export interface IResourceValidation {
  status: ValidationStatusEnum;
  credentials?: Array<ICredentialValidation>
  message?: string;
}

export interface IDescriptorValidation {
  status: ValidationStatusEnum;
  resources?: Array<IResourceValidation>
  message?: string;
}

export interface IDomainLinkageValidation {
  status: ValidationStatusEnum;
  endpointDescriptors?: Array<IDescriptorValidation>
  message?: string;
}

export enum ValidationStatusEnum {
  VALID = 'valid',
  INVALID = 'invalid',
}

export enum ServiceTypesEnum {
  LINKED_DOMAINS = 'LinkedDomains'
}

export enum PromiseStatusEnum {
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled',
}
