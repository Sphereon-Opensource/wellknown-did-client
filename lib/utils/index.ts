import fetch from 'cross-fetch';
import jwt_decode, { JwtHeader, JwtPayload } from 'jwt-decode';

import { WELL_KNOWN_DID_URI } from '../constants';
import WDCErrors from "../constants/Errors";
import { IDidConfigurationResource, ValidationStatusEnum } from '../types';

/**
 * Fetches a DID configuration resource from a given origin.
 *
 * @param origin The origin of the location.
 * @param verifyResource
 * @return {IDidConfigurationResource}, DID configuration resource.
 */
export const fetchWellKnownDidConfiguration = async (origin: string, verifyResource = true): Promise<IDidConfigurationResource> => {
  const url = `${origin}${WELL_KNOWN_DID_URI}`;

  return fetch(url)
    .then((response: Response) => {
      if (response.status >= 400) {
        return Promise.reject(Error(WDCErrors.UNABLE_TO_RETRIEVE_DID_CONFIG_RESOURCE_FROM+`${url}`))
      }

      if (!verifyResource) return response.json()

      return response.json()
        .then((resource: IDidConfigurationResource) => verifyResourceStructure(resource)
        .then(() => resource))
    })
    .catch(() => {
      return Promise.reject(Error(WDCErrors.UNABLE_TO_RETRIEVE_DID_CONFIG_RESOURCE_FROM+`${url}`))
    });
}

/**
 * Verifies the DID configuration resource object structure.
 *
 * @param resource The DID configuration resource.
 */
export const verifyResourceStructure = async (resource: IDidConfigurationResource): Promise<void> => {
  // @context MUST be present.
  if (!resource['@context']) return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_CONTEXT_NOT_PRESENT })

  // linked_dids MUST be present.
  if (!resource.linked_dids) return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_LINKED_DIDS_NOT_PRESENT })

  // The value of linked_dids MUST be an array of DomainLinkageCredential entries.
  if (resource.linked_dids.length === 0) return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.PROPERTY_LINKED_DIDS_DOES_NOT_CONTAIN_ANY_DOAMIN_LINK_CREDENTIALS })

  // Additional members MUST NOT be present in the header
  if (Object.getOwnPropertyNames(resource).filter(property => !['@context', 'linked_dids'].includes(property)).length > 0)
    return Promise.reject({status: ValidationStatusEnum.INVALID, message: WDCErrors.RESOURCE_CONTAINS_ADDITIONAL_PROPS })
}

/**
 * Decodes a JWT token.
 *
 * @param token The JWT token.
 * @param header Option to decode header or payload.
 * @return {JwtPayload | JwtHeader}, Decoded header or payload object.
 */
export const decodeToken = (token: string, header: boolean): JwtPayload | JwtHeader => {
  return jwt_decode(token, { header })
}
