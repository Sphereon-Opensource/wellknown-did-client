// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';

import {
  ISignedDomainLinkageCredential,
  IVerifyCallbackArgs,
  IVerifyCredentialResult
} from '../../../lib/types';
import { DocumentLoader } from '../DocumentLoader';

const vc = require('@digitalcredentials/vc');

export class VcJsVerifier {
  public async verify(args: IVerifyCallbackArgs): Promise<IVerifyCredentialResult> {
    const keyPair = await Ed25519VerificationKey2020.generate();
    const suite = new Ed25519Signature2020({ key: keyPair });
    suite.verificationMethod = (args.credential as ISignedDomainLinkageCredential).credentialSubject.id;

    return await vc.verifyCredential({ credential: args.credential, suite, documentLoader: new DocumentLoader().getLoader() });
  }
}
