# Release Notes

## v1.3.0 - 2020-01-28

feat: dependency upgrades for orbit 0.23 and ipfs 0.40 support

## v1.2.1 - 2020-01-07

feat: allow configuration of S3 client options for endpoint, signature version and address style

## v1.2.0 - 2020-1-3

 feat: add did-doc endpoint consuming CIDs

## v1.1.1 - 2019-12-20

feat: add simple request logging

## v1.1.0 - 2019-12-16

feat: upgrade ipfs log which includes performance improvements

## v1.0.3 - 2019-12-6

fix: analytics uniques fix, getting random ids as origins, likely from extensions

## v1.0.2 - 2019-12-6

fix: resolve profiles for space 3ID
fix: profile and thread calls throwing error which require identity verify funcs

## v1.0.1 - 2019-11-26

Fix analytics properties object

## v1.0.0 - 2019-11-25

Request/Response parity with current service
Multiple fixes
Added test data and test coverage

## v0.1.0 - 2019-11-15

Initial code base for 3Box API Service, a REST API layer over the data which the 3Box pinning node pins for the 3Box network. Directly maps requests from storage layer with out the need to run an IPFS, OrbitDB, or 3Box node.
