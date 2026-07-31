# `@rishi/storage`

Vendor-independent binary object storage for Rishi AI.

| Metadata                  | Value                         |
| :------------------------ | :---------------------------- |
| **Lifecycle**             | Current                       |
| **Implementation Status** | Implemented                   |
| **Current Authority**     | Package source and public API |
| **Owner**                 | Repository Maintainer         |
| **Last Verified**         | 2026-07-31                    |

## Responsibilities

- Defines the public `IFileStorageProvider` contract and Nest injection token.
- Provides the application-facing `StorageService` facade.
- Implements safe local filesystem persistence through `LocalStorageAdapter`.
- Maps filesystem failures to stable storage exceptions.

The package does not own uploads, parsing, database records, authorization, queues, or cloud-provider implementations.

## Configuration

- `STORAGE_PROVIDER`: active provider; currently `local`.
- `STORAGE_LOCAL_BASE_DIR`: absolute path or path relative to the process working directory.

## Public API

Consume contracts, the provider token, service, module, adapter, factory, and storage exceptions only from `@rishi/storage`.
