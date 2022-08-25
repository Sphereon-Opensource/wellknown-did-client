import {
  DIDDocument,
  Service
} from 'did-resolver'

export interface IIssuerConfig {
  issueCallback: IssuanceCallback
}

export interface IDomainLinkageCredential {
  '@context': string[]
  issuer: string
  credentialSubject: ICredentialSubject
  type?: string[]
  issuanceDate: string
  expirationDate: string
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
  issueCallback?: IssuanceCallback
}

export interface IIssueDomainLinkageCredentialArgs {
  did: string
  origin: string
  issuanceDate?: string
  expirationDate: string
  options: IIssueDomainLinkageCredentialOptions
  issueCallback?: IssuanceCallback
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
  linked_dids: Array<DomainLinkageCredential>
}

export interface IVerifierConfig {
  verifySignatureCallback: VerifyCallback
  // Option to only verify dids mentioned in the service endpoint descriptor
  onlyVerifyServiceDid?: boolean
}

export interface IServiceEndpoint {
  origins: Array<string>
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
  credential: DomainLinkageCredential
  proofFormat?: ProofFormatTypesEnum
}

export interface IVerifyDomainLinkageArgs {
  didDocument: DIDDocument
  verifySignatureCallback?: VerifyCallback
  // Option to only verify dids mentioned in the service endpoint descriptor
  onlyVerifyServiceDid?: boolean
}

export interface IVerifyEndpointDescriptorArgs {
  descriptor: Service
  verifySignatureCallback?: VerifyCallback
  // Option to only verify dids mentioned in the service endpoint descriptor
  onlyVerifyServiceDid?: boolean
}

export interface IVerifyResourceArgs {
  configuration?: IDidConfigurationResource
  origin?: string
  did?: string
  verifySignatureCallback?: VerifyCallback
}

export interface IVerifyDomainLinkageCredentialArgs {
  credential: DomainLinkageCredential
  verifySignatureCallback?: VerifyCallback
}

export type StrictPropertyCheck<T, TExpected, TError> = Exclude<keyof T, keyof TExpected> extends never ? unknown : TError;

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

export type DomainLinkageCredential = ISignedDomainLinkageCredential | string

export type IssuanceCallback = (args: IIssueCallbackArgs) => Promise<DomainLinkageCredential>

export type VerifyCallback = (args: IVerifyCallbackArgs) => Promise<IVerifyCredentialResult>
