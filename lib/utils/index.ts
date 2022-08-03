import fetch from 'cross-fetch';
import jwt_decode, { JwtHeader, JwtPayload } from 'jwt-decode';

import { WELL_KNOWN_DID_URI } from '../constants';
import { IDidConfigurationResource } from '../types';

/**
 * Fetches a DID configuration resource from a given origin.
 *
 * @param origin The origin of the location.
 * @return {IDidConfigurationResource}, DID configuration resource.
 */
export const fetchWellKnownDidConfiguration = async (origin: string): Promise<IDidConfigurationResource> => {
  const url = `${origin}${WELL_KNOWN_DID_URI}`;

  return fetch(url)
    .then((response: Response) => {
      if (response.status >= 400) {
        return Promise.reject(Error(`Unable to retrieve did configuration resource from ${url}`))
      }
      return response.json();
    })
    .catch(() => {
      return Promise.reject(Error(`Unable to retrieve did configuration resource from ${url}`))
    });
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
