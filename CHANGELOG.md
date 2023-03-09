# Release Notes

The well-known DIDs client typescript library is still in an alpha state at this point. Please note that the interfaces might still change a bit as the software still is in active development.

## v0.1.3 - 2023-03-09

- Updated:
  - Update to latest SSI-types
  - Move to @sphereon/isomorphic-webcrypto as orignal package isn't maintained anymore and was causing problems in newer RN environments
- Fixed:
  - Fix issue when serviceEndpoint is an object, thanks to @jfromaniello for the contribution


## v0.1.2 - 2022-09-01

Fixed:
- Bug when encountering relative ids in a DID document
- Error export


## v0.1.1 - 2022-08-25

Changed:
- Improved imports
- Downgrade DID resolver packages for maximum compatibility with other projects
- Moved error strings to constants

Added:
- Allow for specific issuance callbacks


## v0.1.0 - 2022-08-08

Initial release

